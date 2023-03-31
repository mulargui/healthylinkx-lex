
const {
	LexModelsV2Client,
	CreateBotCommand,
	DescribeBotCommand,
	CreateBotLocaleCommand,
	DescribeBotLocaleCommand,
	CreateIntentCommand,
	CreateSlotCommand,
	BuildBotLocaleCommand,
	DescribeSlotCommand,
	ListSlotsCommand,
	CreateBotAliasCommand,
	CreateBotVersionCommand,
	DescribeBotVersionCommand,
	DescribeBotAliasCommand,
	UpdateIntentCommand,
	DescribeIntentCommand
} = require("@aws-sdk/client-lex-models-v2");
const { 
	IAMClient, 
	CreateServiceLinkedRoleCommand 
} = require("@aws-sdk/client-iam");

// ======== helper function ============
function sleep(secs) {
	return new Promise(resolve => setTimeout(resolve, secs * 1000));
}

// ====== creates the chatbot =====
async function UXCreate() {
	
	try {
			
		//create a role to call the lambda
		const iamclient = new IAMClient({});
		var data = await iamclient.send(new CreateServiceLinkedRoleCommand({AWSServiceName: 'lex.amazonaws.com'}));
		const iamrolearn = data.Role.Arn;
		console.log("Success. healthylinkx-bot IAM role created.");
		
		//create the chatbot
		const lexclient = new LexModelsV2Client({});
		data = await lexclient.send(new CreateBotCommand({
			botName: 'healthylinkx-bot',
			idleSessionTTLInSeconds:600,
			dataPrivacy: {childDirected: false},
			roleArn: iamrolearn
		}));
		const botid = data.botId;

		while(true) {
			data = await lexclient.send(new DescribeBotCommand({botId: botid}));
			if (data.botStatus  === 'Available') break;
			console.log("Waiting. healthylinkx-bot " + data.botStatus);
			await sleep(10);
		}
		console.log("Success. healthylinkx-bot provisioned.");

		//add a language to the chatbot (english)
		await lexclient.send(new CreateBotLocaleCommand({
			botId: botid,
			botVersion: 'DRAFT',
			localeId: 'en_US',
			nluIntentConfidenceThreshold: 0.80
		}));

		while(true) {
			data = await lexclient.send(new DescribeBotLocaleCommand({
				botId: botid,
				botVersion: 'DRAFT',
				localeId: 'en_US'
			}));
			if (data.botLocaleStatus  ===  'NotBuilt') break;
			console.log("Waiting. healthylinkx-bot english locale " + data.botLocaleStatus);
			await sleep(10);
		}
		console.log("Success. healthylinkx-bot english locale provisioned.");
		
		//add a basic intent to the chatbot (Search for doctors)
		data = await lexclient.send(new CreateIntentCommand({
			botId: botid,
			botVersion: 'DRAFT',
			localeId: 'en_US',
			intentName: 'SearchDoctors'
		}));
		const intentid = data.intentId;
		console.log("Success. healthylinkx-bot SearchDoctors intent added.");

		//add a slot to the intent (lastname)
		data = await lexclient.send(new CreateSlotCommand({
			botId: botid,
			botVersion: 'DRAFT',
			intentId: intentid,
			localeId: 'en_US',
			slotName: 'DoctorName',
			slotTypeId: 'AMAZON.LastName',
			valueElicitationSetting: {
				slotConstraint: 'Required',
				promptSpecification: {
					maxRetries: 2, 
					messageGroups: [{message: {plainTextMessage:{value:'Do you know the name of the doctor?'}}}]
				}
			}
		}));
		nameslotid = data.slotId;
		console.log("Success. healthylinkx-bot LastName slot added.");		
		
		//add a slot to the intent (zipcode)
		data = await lexclient.send(new CreateSlotCommand({
			botId: botid,
			botVersion: 'DRAFT',
			intentId: intentid,
			localeId: 'en_US',
			slotName: 'ZipCode',
			slotTypeId: 'AMAZON.Number',
			valueElicitationSetting: {
				slotConstraint: 'Required',
				promptSpecification: {
					maxRetries: 2, 
					messageGroups: [{message: {plainTextMessage:{value:'Which zipcode do you reside in?'}}}]
				}
			}
		}));
		zipcodeslotid = data.slotId;
		console.log("Success. healthylinkx-bot ZipCode slot added.");		

		//add a slot to the intent (gender)
		data = await lexclient.send(new CreateSlotCommand({
			botId: botid,
			botVersion: 'DRAFT',
			intentId: intentid,
			localeId: 'en_US',
			slotName: 'Gender',
			slotTypeId: 'AMAZON.AlphaNumeric',
			valueElicitationSetting: {
				slotConstraint: 'Required',
				promptSpecification: {
					maxRetries: 2, 
					messageGroups: [{message: {plainTextMessage:{value:'Any gender preference (male/female)?'}}}]
				}
			}
		}));
		genderslotid = data.slotId;
		console.log("Success. healthylinkx-bot Gender slot added.");		

		//add priorities and other properties to the intent
		await lexclient.send(new UpdateIntentCommand({
			botId: botid,
			botVersion: 'DRAFT',
			intentId: intentid,
			intentName: 'SearchDoctors',
			localeId: 'en_US',
			slotPriorities: [{priority: 0, slotId: nameslotid}, 
				{priority: 1, slotId: zipcodeslotid},
				{priority: 2, slotId: genderslotid}],
			sampleUtterances:[{utterance: "Searching for a doctor"},
				{utterance: "Looking for a doctor"},
				{utterance: "I need a doctor"}],
			fulfillmentCodeHook: {
				active: true,
				enabled: true
			}
		}));
		console.log("Success. healthylinkx-bot updated SearchDoctors intent.");

		//build the chatbot
		await lexclient.send(new BuildBotLocaleCommand({
			botId: botid,
			botVersion: 'DRAFT',
			localeId: 'en_US'
		}));

		while(true) {
			data = await lexclient.send(new DescribeBotLocaleCommand({
				botId: botid,
				botVersion: 'DRAFT',
				localeId: 'en_US'
			}));
			if (data.botLocaleStatus  ===  'Built') break;
			console.log("Waiting. healthylinkx-bot " + data.botLocaleStatus);
			await sleep(10);
		}
		console.log("Success. healthylinkx-bot built.");

		//create a version of the bot
		data = await lexclient.send(new CreateBotVersionCommand({
			botId: botid,
			botVersionLocaleSpecification: {en_US: {sourceBotVersion: 'DRAFT'}}
		}));
		botversion = data.botVersion;

		while(true) {
			await sleep(10);
			data = await lexclient.send(new DescribeBotVersionCommand({
				botId: botid,
				botVersion: botversion
			}));
			if (data.botStatus  ===  'Available') break;
			console.log("Waiting. healthylinkx-bot version " + data.botStatus);
		}
		console.log("Success. healthylinkx-bot version available.");
	
		//create an alias of the bot and associate the lambda
		data = await lexclient.send(new CreateBotAliasCommand({
			botId: botid,
			botVersion: botversion,
			botAliasName: 'healthylinkx-bot-prod',
			botAliasLocaleSettings: {
				en_US: {
					codeHookSpecification: {
						lambdaCodeHook: {
							codeHookInterfaceVersion: '1.0',
							lambdaARN: 'arn:aws:lambda:' + process.env.AWS_REGION + ':' + 
								process.env.AWS_ACCOUNT_ID + ':function:healthylinkx-bot-lambda'
						}
					},
					enabled:true
				}
			}
		}));
		botalias = data.botAliasId;

		while(true) {
			await sleep(10);
			data = await lexclient.send(new DescribeBotAliasCommand({botId: botid, botAliasId: botalias}));
			if (data.botAliasStatus  === 'Available') break;
			console.log("Waiting. healthylinkx-bot alias " + data.botAliasStatus);
		}
		console.log("Success. healthylinkx-bot alias available.");
		console.log("All done!");

	} catch (err) {
		console.log("Error. ", err);
	}
}

module.exports = UXCreate;