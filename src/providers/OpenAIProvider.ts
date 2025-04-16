import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import log from "loglevel";
import {
    ChatMessage,
    prettyJson
} from "@agentic-profile/common";

import { extractJson } from "../misc.js";
import {
    AIProvider,
    ChatCompletionParams,
    ChatCompletionResult,
    CompletionParams,
    CompletionResult
} from "../models.js";

// prepare to chat with open ai
const apiKey = process.env.OPENAI_API_KEY
const openai = apiKey ? new OpenAI({
    //organization: "YOUR_ORG_ID",
    apiKey
    //dangerouslyAllowBrowser: true
}) : null;

/*
function refineName( name ) {
    return name.replace(/[^a-zA-Z0-9_-]/g,'');
}*/

//const TOKEN_COST = 0.002 / 1000;
const TOKEN_MARKUP = 10;    // ten times

interface TokenPricing {
    input: number,
    output: number
}

const MODEL_TOKEN_PRICING: Record<string, TokenPricing> = {
    "gpt-4o-mini": {
        input: 0.15 / 1000000,
        output: 0.60 / 1000000
    },
    "gpt-3.5-turbo": {
        input: 0.5 / 1000000,
        output: 1.5 / 1000000
    },
    DEFAULT: {
        input: 5 / 1000000,
        output: 15 / 1000000
    },
};

export default class OpenAIProvider implements AIProvider {
    private model: string

    constructor( model?: string ) {
        this.model = model || 'gpt-4o-mini';
        log.info( "Vertex AI using", this.model );
    }

    get ai() {
        return 'openai:' + this.model;
    }

    get poweredBy() {
        const version = this.model.split('-').join(' ');
        return 'OpenAI ' + version;
    }

    async completion({ prompt }: CompletionParams ) {
        if( !openai )
            throw new Error("OpenAI Provider could not start, missing OPENAI_API_KEY");   

        const params = { model: this.model, prompt };
        const aiResponse = await openai.completions.create( params );
        const { usage } = aiResponse;
        const cost = this.calculateCost( usage );

        const generatedText = aiResponse.choices[0]?.text;
        const { jsonObjects, textWithoutJson } = extractJson( generatedText ?? "");

        return {
            text: generatedText,
            json: jsonObjects,
            textWithoutJson,
            usage,
            cost: cost * TOKEN_MARKUP,
            context: {
                model: this.ai,
                params,
                response: aiResponse
            }
        } as CompletionResult;
    }

    //async completion( prompt, messages = [], instruction ) {
    async chatCompletion({ prompt, agentDid, messages: messagesIn = [], instruction }: ChatCompletionParams ) {
        if( !openai )
            throw new Error("OpenAI Provider could not start, missing OPENAI_API_KEY");
             
        // make sure each message name is refined/cleaned for OpenAI
        const messages = messagesIn.map(m=>{
            const { from, content } = m;
            const role = from === agentDid ? "user" : "assistant";
            return { role, content } as ChatCompletionMessageParam;
        });

        if( instruction )
            messages.unshift({ role:'system', name:'system', content: instruction });

        if( prompt )
            messages.push({ role:'user', content: prompt });

        const params = { model: this.model, messages };
        const chatCompletion = await openai.chat.completions.create( params );
        const { usage } = chatCompletion;
        const cost = this.calculateCost( usage );

        const generatedText = chatCompletion.choices[0]?.message?.content;
        const { jsonObjects, textWithoutJson } = extractJson( generatedText ?? "");

        console.log(
            `\n\n==== OpenAI completion ${this.model}:\n\n`,
            JSON.stringify( messages, null, 4 ),
            '\n\n==== Reply:', textWithoutJson,
            '\n\n==== JSON:', prettyJson( jsonObjects )
        );

        return {
            reply: { from: agentDid, content: textWithoutJson, created: new Date() } as ChatMessage, 
            json: jsonObjects,
            textWithoutJson,
            usage,
            cost: cost * TOKEN_MARKUP,
            context: {
                model: this.ai,
                params,
                promptMarkdown: promptToMarkdown( messages ),
                response: chatCompletion
            }
        } as ChatCompletionResult;
    }

    // usage: { prompt_tokens: 571, completion_tokens: 145, total_tokens: 716 }
    calculateCost( usage: any ) {
        if( !usage ) {
            console.log( 'ERROR: completion missing usage data: ' + this.ai );
            return 0;
        }
        const { prompt_tokens, completion_tokens } = usage;

        let pricing = MODEL_TOKEN_PRICING[ this.model ];
        if( !pricing ) {
            console.log( 'WARNING: Failed to find pricing for ' + this.ai );
            pricing = MODEL_TOKEN_PRICING.DEFAULT;
        }
        const { input: inputCost, output: outputCost } = pricing;

        let cost = 0;
        if( inputCost && prompt_tokens ) 
            cost += inputCost * prompt_tokens;
        else
            console.log( 'ERROR: Missing inputCost or prompt token count', inputCost, prompt_tokens );
        if( outputCost && completion_tokens )
            cost += outputCost * completion_tokens;
        else
            console.log( 'ERROR: Missing outputCost or completion token count', outputCost, completion_tokens );

        return cost;
    }
}

function promptToMarkdown( messages: ChatCompletionMessageParam[] ) {
    return messages.map(e=>`**${e.role}**: ${e.content}`).join('\n\n');
}