const JSON_PREFIX_SUFFIX_PAIRS = [
    ["```json", "```"],
    ["```", "```"],
    ["\\`\\`\\`json", "\\`\\`\\`"]
];

export function asJSON( reply: string ) {
    if( !reply )
        return null;
    reply = reply.trim();
    if( reply.length < 2 )
    	return null;

    let json;
    if( reply[0] === '{' || reply[0] === '[')
    	json = reply;
    else {

	    // find starting pair
	    const lowerReply = reply.toLowerCase();
	    const pair = JSON_PREFIX_SUFFIX_PAIRS.find(([prefix])=>{
            const found = lowerReply.indexOf(prefix) > -1;
            return found;
        });
	    if( !pair )
	        return null;
	    const [ prefix, suffix ] = pair;

	    let start = lowerReply.indexOf( prefix ) + prefix.length;
	    const end = lowerReply.indexOf( suffix, start );
	    if( end == -1 )
	        return null;

	    json = reply.substring(start,end);
	}
	
    try {
        return JSON.parse( json );
    } catch( err ) {
        console.error( 'Failed to parse JSON', json );
        return null;
    }
}

export interface TokenCounts {
    prompt_tokens: number,
    completion_tokens: number
}

export interface TokenPricing {
    model: string,
    inputCostPerMillion: number
    outputCostPerMillion: number
}

export interface CalculateCostParams {
    tokenCounts: TokenCounts,
    pricing: TokenPricing
}

const TOKEN_MARKUP = 10;

const DEFAULT_PRICING = {
    model: "default",
    inputCostPerMillion: 0.1,
    outputCostPerMillion: 0.3   
}

export function calculateInferenceCost({ tokenCounts, pricing = DEFAULT_PRICING }: CalculateCostParams ) {
    const { prompt_tokens = 0, completion_tokens = 0 } = tokenCounts;
    const { inputCostPerMillion = 0, outputCostPerMillion = 0, model } = pricing;

    const cost =
        prompt_tokens * inputCostPerMillion / 1000000
        + completion_tokens * outputCostPerMillion / 1000000;
    const roundedCost = Math.round( cost * 100000 ) / 100000;

    const billed = roundedCost * TOKEN_MARKUP;
    console.log( 'calculateInferenceCost', tokenCounts, pricing, "base", roundedCost, "billed", billed, model ); 
    return billed;
}
