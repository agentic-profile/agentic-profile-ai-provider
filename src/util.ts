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