import {
    ChatMessage,
    DID
} from "@agentic-profile/common";
//import { loadEliza, Eliza } from 'eliza-core';
import Eliza from "./elizabot.js";

import {
    AIProvider,
    ChatCompletionParams
} from "../../models.js";

// Yes, global scope because there are many instances of this provider...
const sessions = new Map<DID,Eliza>();

export default class ElizaProvider implements AIProvider {
    private model: string;

    constructor( model?: string ) {
        this.model = model || "eliza-1.2.0-beta.0";
        console.log( "Eliza with", this.model );
    }

    get ai() {
        return "eliza:" + this.model;
    }

    get poweredBy() {
        const version = this.model.split("-").splice(1).join(" ");
        return "Eliza " + version;
    }

    async completion( { agentDid, messages }: ChatCompletionParams ) {
        let eliza = sessions.get( agentDid );
        if( !eliza ) {
            eliza = new Eliza();
            sessions.set( agentDid, eliza );
        };

        const userText = lastPeerMessageText( agentDid, messages );
        let content;
        if( userText )
            content = eliza.transform( userText )!;
        else
            content = eliza.getInitial()!;

        const reply = {
            from: agentDid,
            content,
            created: new Date()
        };

        return { reply, cost: 0.01 };
    }
}

function lastPeerMessageText( agentDid: DID, messages: ChatMessage[] ): string | undefined {
    const { content } = messages.reverse().find(e=>e.from !== agentDid) ?? {};
    return typeof content === 'string' ? content : undefined;
}