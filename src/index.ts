import { AIProvider } from "./models.js";

import ElizaProvider from "./providers/eliza/ElizaProvider.js";
import VertexAIProvider from "./providers/VertexAIProvider.js";
import OpenAIProvider from "./providers/OpenAIProvider.js";

export function selectAIProvider( aimodel?:string ): AIProvider {
    if( aimodel ) {
        const ai = aimodel.trim().toLowerCase();
        if( ai.startsWith( "openai:" ) )
            return new OpenAIProvider( ai.substring(7) );
        if( ai.startsWith( "vertex:" ) )
            return new VertexAIProvider( ai.substring(7) );
        if( ai.startsWith( "eliza:" ) )
            return new ElizaProvider( ai.substring(6) );
        else
            throw new Error('Unsupported AI provider: ' + ai );
    } else
        return new ElizaProvider();
}

export * from "./models.js";
export * from "./misc.js";
