/*
const Groq = require('groq-sdk')
const { asJSON } = require('./util')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TOKEN_MARKUP = 10;    // ten times cost

const MODEL_TOKEN_PRICING = {
    "mixtral-8x7b-32768": {
        input: 0.24 / 1000000,
        output: 0.24 / 1000000
    },
    "llama3-70b-8192": {
        input: 0.59 / 1000000,
        output: 0.79 / 1000000
    },
    "llama3-8b-8192": {
        input: 0.05 / 1000000,
        output: 0.08 / 1000000
    },
    DEFAULT: {
        input: 1 / 1000000,
        output: 1 / 1000000
    },
};

class GroqBridge {
    constructor( model ) {
        this.model = model || 'llama3-70b-8192'
    }

    get ai() {
        return 'groq:' + this.model;
    }

    get poweredBy() {
        const version = this.model.split('-').join(' ');
        return 'Groq ' + version;
    }

    async completion( prompt, messages = [], instruction ) {
        // make sure each message name is refined/cleaned for OpenAI
        messages = messages.map(m=>{
            let { role, content } = m;
            if( role !== 'user' )
                role = 'assistant';

            return { role, content };
        });

        if( instruction )
            messages.unshift({ role:'system', name:'system', content: instruction });

        if( prompt )
            messages.push({ role:'user', content: prompt });

        //const chatCompletion = await openai.chat.completions.create({ model: this.model, messages });
        const chatCompletion = await groq.chat.completions.create({ model: this.model, messages });

        const { usage } = chatCompletion;
        const cost = this.calculateCost( usage );

        const reply = chatCompletion.choices[0]?.message?.content;
        const json = asJSON( reply );

        console.log(
            `\n\n==== Groq completion ${this.model}, Last 3 messages:\n\n`,
            JSON.stringify( messages.slice(-3), null, 4 ),
            '\n\n==== Reply:', reply,
            '\n\n==== JSON:', JSON.stringify( json, null, 4 )
        );

        return { reply, json, usage, cost };
    }

    // usage: { prompt_tokens: 571, completion_tokens: 145, total_tokens: 716 }
    calculateCost(usage) {
        console.log( 'Groq usage', usage );
        if( !usage ) {
            console.log( 'ERROR: completion missing usage data: ' + this.ai );
            return 0;
        }
        const { prompt_tokens, completion_tokens } = usage;

        let pricing = MODEL_TOKEN_PRICING[this.model];
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

module.exports = {
    GroqBridge
}
*/