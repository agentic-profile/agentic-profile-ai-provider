import { AIProvider } from "./models.js"

import Eliza from "./providers/eliza/eliza-provider.js"
import { VertexAIBridge } from "./providers/VertexAIBridge.js"

export function selectAIProvider( aimodel?:string ): AIProvider {
    if( aimodel ) {
        const ai = aimodel.trim().toLowerCase();
        if( ai.startsWith( "vertex:" ) )
            return new VertexAIBridge( ai.substring(7) );
        if( ai.startsWith( "eliza:" ) )
            return new Eliza( ai.substring(7) );
        else
            throw new Error('Unsupported AI provider: ' + ai );
    } else
        return new Eliza();
}

export * from "./models.js";
