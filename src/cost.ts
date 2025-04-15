import log from "loglevel";

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
    log.info( 'calculateInferenceCost', tokenCounts, pricing, "base", roundedCost, "billed", billed, model ); 
    return billed;
}

