import {
    HarmBlockThreshold,
    HarmCategory,
    VertexAI
} from "@google-cloud/vertexai";
import {
    createTimer,
    prettyJson
} from "@agentic-profile/common";
import {
    AgentMessage,
    DID,
} from "@agentic-profile/common/schema";
import log from "loglevel";

import { extractJson } from "../misc.js"
import {
    calculateInferenceCost,
    TokenPricing
} from "../cost.js"
import {
    AIProvider,
    ChatCompletionParams,
    ChatCompletionResult,
    CompletionParams,
    CompletionResult
} from "../models.js";

const project = process.env.VERTEX_PROJECT ?? "avatar-factory-ai";
const location = process.env.VERTEX_LOCATION ?? "us-west1";
const vertexAI = new VertexAI({ project, location });

const debug = (process.env.DEBUG_FILTER ?? "").split(',').includes("vertex");

/*
    Gemini API: Advanced reasoning, multiturn chat, code generation, and multimodal prompts.
    PaLM API: Natural language tasks, text embeddings, and multiturn chat.
*/

const PRICING: Record<string, TokenPricing> = {
    "gemini-2.0-flash-lite": {
        model: "gemini-2.0-flash-lite",
        inputCostPerMillion: 0.075,
        outputCostPerMillion: 0.30
    }
}

interface MessagePart {
    text: string
}

interface VertexMessage {
    role: "user" | "model" | "developer",
    parts: MessagePart[]
}

interface InferenceParams {
    contents: VertexMessage[]
    systemInstruction?: VertexMessage  
}

export default class VertexAIProvider implements AIProvider {
    private model: string;

    constructor( model?: string ) {
        this.model = model || "gemini-2.0-flash-lite";
        log.info( "Vertex AI using", this.model );
    }

    get ai() {
        return "vertex:" + this.model;
    }

    get poweredBy() {
        const version = this.model.split("-").splice(1).join(" ");
        return "Gemini " + version;
    }

    async completion({}: CompletionParams): Promise<CompletionResult> {
        throw new Error("VertexAI completion is not supoported yet");
    }

    // prompt:  Optional prompt to insert as last message
    // agentDid: required to know which messages came from agent
    // messages: [{ name:, role:, content: string }]
    //          order must always be user => model => user => model
    //          First must be user, last must be model
    // instruction:  system instruction, overall goals, etc.
    async chatCompletion( completionParams: ChatCompletionParams ) {
        if( !vertexAI )
            throw new Error("Vertex did not start");

        const { elapsed } = createTimer( "vertex.chatCompletion" );

        // prepare
        const generativeModel = getGenerativeModel( this.model ); 
        const params = await prepareParams( generativeModel, completionParams );

        // generate
        if( debug )
            log.debug( "Generating content for", prettyJson(params) );
        const { response } = await generativeModel.generateContent( params );
        if( !response.candidates || !response.candidates.length )
            throw new Error( "No AI inference: " + prettyJson(response) );
        const { finishReason, safetyRatings, content } = response.candidates[0];
        if( finishReason == "SAFETY" ) {
            const details = describeSafetyRatings( safetyRatings );
            throw new Error("Blocked by safety net: " + details );
        }

        // make heads and tails from AI result...
        if( !content || !content.parts.length )
            throw new Error( "No AI content: " + prettyJson(response) );

        const generatedText = cleanReply( content.parts[0].text );
        if( !generatedText ) {
            //console.log( "No content generated for", JSON.stringify(params,null,4) );
            throw new Error( "No AI text content: " + prettyJson(response) );
        }

        // any JSON?
        const { jsonObjects, textWithoutJson } = extractJson( generatedText );
                
        const { totalTokens: completion_tokens } = await generativeModel.countTokens({ contents: [content] });
        const {
            promptTokenCount: prompt_tokens = 0,
            totalTokenCount: total_tokens = 0
        } = response.usageMetadata || {};
        const usage = { prompt_tokens, completion_tokens, total_tokens };

        const cost = calculateInferenceCost({ tokenCounts: usage, pricing: PRICING[this.model] });

        const messageTail = params.contents.slice(-3);
        const messageCount = params.contents.length;
        const { agentDid, instruction } = completionParams;

        if( debug ) log.debug(
            `\n\n==== Vertex completion ${this.model} on messages:\n\n`,
            JSON.stringify( messageTail, null, 4 ),
            "\n\n==== Instruction:", instruction,
            "\n\n==== Reply:", textWithoutJson,
            "\n\n==== JSON:", prettyJson( jsonObjects ), 
            { messageCount }
        );

        elapsed( "completed" );

        return {
            reply: { from: agentDid, content: textWithoutJson, created: new Date() } as AgentMessage, 
            json: jsonObjects,
            textWithoutJson,
            usage, 
            cost, 
            context: { 
                model: this.ai,
                params,
                promptMarkdown: promptToMarkdown( params ),
                response
            }
        } as ChatCompletionResult;
    }
}

function promptToMarkdown( params: InferenceParams ) {
    let md = params.systemInstruction ? messageText( params.systemInstruction ) + '\n\n' : '';
    md += params.contents.map(e=>`**${e.role}**: ${messageText(e)}`).join('\n\n');
    return md;
}

function messageText( { parts }: VertexMessage ) {
    return parts && parts.length > 0 ? parts[0].text : '';
}

function toMessage( role:string, content:string | Record<string, any> ) {
    const text = (typeof content === 'string' ? content : "JSON content: " + JSON.stringify(content)) as string;
    return { role, parts:[{ text }] } as VertexMessage;    
}

function isAgentMessage( message: AgentMessage, agentDid: DID ) {
    return message.from === agentDid;
}

// { role: "user"|"assistant"|"system", name:, content: string }
// => { role: "user"|"model", parts:[{text}] }
function convertMessages( messages: AgentMessage[], agentDid: DID ) {
    if( !messages )
        return [];
    const vMessages = messages.map(m=>{
        const role = isAgentMessage( m, agentDid ) ? "model" : "user";
        return toMessage( role, m.content );
    });

    // ensure messages alternate between user and model, combining if necessary
    // messages must be oldest first, and newest last
    let result: VertexMessage[] = [];
    vMessages.forEach(m=>{
        if( result.length > 0 ) {
            const newest = result[result.length-1];
            if( newest.role === m.role ) {
                newest.parts[0].text += "\n\n" + m.parts[0].text;
                return;
            }
        }

        result.push(m);
    });
    return result;
}

function getGenerativeModel( model: string ) {
    const threshold = HarmBlockThreshold.BLOCK_ONLY_HIGH;
    return vertexAI.getGenerativeModel({
        model,
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_UNSPECIFIED,
                threshold
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold
            },
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold
            },
        ],
        generationConfig: { maxOutputTokens: 1000 },
    });
}

async function prepareParams( generativeModel: any, { prompt, agentDid, messages, instruction }: ChatCompletionParams ) {
    const params = {
        contents: convertMessages( messages, agentDid )
    } as InferenceParams;
    const { contents } = params;

    if( prompt ) {
        if( lastMessage( contents )?.role === "user" )
            contents.push( toMessage( "model", "I understand") );   

        contents.push( toMessage( "user", prompt ) );   
    }

    if( contents.length > 0 && contents[0].role === "model" )
        contents.unshift( toMessage("user","Hello") );  // First message must be from user

    // last message must always be from user
    if( lastMessage( contents )?.role !== "user" )
        contents.push( toMessage("user","Tell me more") );

    let { totalTokens: inputTokens } = await generativeModel.countTokens({ contents });
    if( instruction ) {
        const systemInstruction = {
            role: "developer",
            parts: [
                { text: instruction }
            ]
        } as VertexMessage;
        params.systemInstruction = systemInstruction;

        const { totalTokens: systemTokens } = await generativeModel.countTokens({ contents: [ systemInstruction ] });
        inputTokens += systemTokens;
    }

    return params;
}

function percentage(n:number) {
    return "" + Math.floor(n*100) + "%";
}

function lastMessage( messages: VertexMessage[] ) {
    return messages[ messages.length - 1 ];
}

function cleanReply( reply:string | undefined ) {
    if( !reply )
        return reply;
    else
        return reply.replace(/&#x20;/g, "").replace("<br>","").trim();
}

function describeSafetyRatings( safetyRatings:any ) {
    if( !safetyRatings )
        return "Unknown";

    if( debug )
        log.debug( "safety ratings", prettyJson(safetyRatings) );

    return safetyRatings.reduce((result:any,e:any)=>{
        if( e.blocked ) {
            const { category, probabilityScore, severityScore } = e;
            const label = category.toLowerCase().split("_").splice(2).join(" ");
            result.push( `${label} (${percentage(probabilityScore)} ${percentage(severityScore)})` );
        }
        return result;
    },[]).join();
}