const SearchDoctors = require("./providers.js");

function FormatResult(rows){
    if (rows == null) return 'No matching providers were found.';
    if (!rows.length) return 'No matching providers were found.';
	
    var output = '';
    for (var i = 0; i < rows.length; i++) {
        output += "<TR>";
        for(var j in rows[i]) 
            if (rows[i].hasOwnProperty(j)) 
                output += ("<TD>" + rows[i][j] + "</TD>");
        output += "</TR>";
    }
    return output;
}

function ServerReply (code, event, result){
	
	if (code == 200){
		event.sessionState.intent.state = 'Fulfilled';	
        result = FormatResult(result);
    }else
		event.sessionState.intent.state = 'Failed';	

    return {
        sessionState: {
            sessionAttributes: event.sessionState.sessionAttributes,
            dialogAction: {
                type: 'Close'
            },
            intent: event.sessionState.intent
        },
        messages: [{
            contentType: 'PlainText',
            //content: 'original event: ' + JSON.stringify(event)
            content:    'results: ' + JSON.stringify(result)
        }],
        sessionId: event.sessionId,
        requestAttributes: event.requestAttributes
    };
}

async function SearchDoctorsIntent (event){
    var DoctorName, ZipCode, Gender;
    for (const [key, value] of Object.entries(event.interpretations[0].intent.slots)) {
        switch(key){
            case 'DoctorName':
                DoctorName = value.value.interpretedValue;
                break;
            case 'ZipCode':
                ZipCode = value.value.interpretedValue;
                break;
            case 'Gender':
                Gender = value.value.interpretedValue;
                break;
            default:
                return ServerReply(204, event);
        }
    }
    var ret = await SearchDoctors(DoctorName, ZipCode, Gender);
    return ServerReply(ret.code, event, ret.text);
}

exports.handler = async (event) => {
	
	if (!event)
		return ServerReply(204);

	if (event.invocationSource !== 'FulfillmentCodeHook')
        return ServerReply(204, event);

    if (event.interpretations[0].intent.state !== 'ReadyForFulfillment')
        return ServerReply(204, event);

    if (event.interpretations[0].intent.name !== 'SearchDoctors')
        return ServerReply(204, event);

	return await SearchDoctorsIntent(event);
}; 