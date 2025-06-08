import {
    AgentMessage,
    DID
} from "@agentic-profile/common/schema";

export interface TokenCounts {
    prompt_tokens: number,
    completion_tokens: number,
    total_tokens: number   
}


//===== Prompt =====

// IN
export interface CompletionParams {
    prompt: string 
}

// OUT context
export interface CompletionContext {
    model: string,  // ai model being used
    params: any,    // raw parameters provided to model for completion
    response: any   // raw response from model
}

// OUT
export interface CompletionResult {
    text: string,
    json: any[],
    textWithoutJson: string,
    usage: TokenCounts,
    cost: number,                  // US dollars
    context: CompletionContext
}

//===== Chat =====

// IN
export interface ChatCompletionParams {
    prompt?: string,
    agentDid: DID,
    messages: AgentMessage[],
    instruction?: string   
}

// OUT context
export interface ChatCompletionContext {
    model: string,                  // ai model being used
    params: any,                    // raw parameters provided to model for completion
    response: any,                  // raw response from model
    promptMarkdown: string          // Human readable markdown representation of context/prompt useful for debugging
}

// OUT
export interface ChatCompletionResult {
    reply: AgentMessage,
    json: any[],
    textWithoutJson: string,
    usage?: TokenCounts,
    cost: number,                  // US dollars
    context: ChatCompletionContext
}

export interface AIProvider {
    completion: ( params: CompletionParams ) => Promise<CompletionResult>,
    chatCompletion: ( params: ChatCompletionParams ) => Promise<ChatCompletionResult>
}