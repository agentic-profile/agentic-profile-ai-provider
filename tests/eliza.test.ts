import {
    selectAIProvider
} from "../src/index"

describe("Eliza", () => {
    test("start chat", async () => {
        const eliza = selectAIProvider("eliza:");
        const agentDid = "did:web:example.com:sam#agent-chat";
        const params = {
            agentDid,
            messages: []
        }
        const { reply } = await eliza.chatCompletion( params );
        console.log( 'Eliza says', reply.content );
        expect( typeof reply.content ).toBe( "string" );
    });

    test("continue chat", async () => {
        const eliza = selectAIProvider("eliza:");
        const agentDid = "did:web:example.com:sam#agent-chat";
        const params = {
            agentDid,
            messages: [
                {
                    from: "did:web:example.com:dave#agent-chat",
                    content: "Good morning!  What a sunny day :)"
                }
            ]
        }
        const { reply } = await eliza.chatCompletion( params );
        console.log( 'Eliza says', reply.content );
        expect( typeof reply.content ).toBe( "string" );
    });
});
