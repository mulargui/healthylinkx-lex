const constants = require('./envparams.ts');
const {
	RDSClient,
	DescribeDBInstancesCommand
} = require("@aws-sdk/client-rds");
const { 
	IAMClient, 
	CreateRoleCommand 
} = require("@aws-sdk/client-iam");
const {
    LambdaClient,
    CreateFunctionCommand,
	AddPermissionCommand
} = require("@aws-sdk/client-lambda");

const fs = require('graceful-fs');
const exec = require('await-exec');
const AdmZip = require('adm-zip');
const replace = require('replace-in-file');

// ======== helper function ============
function sleep(secs) {
	return new Promise(resolve => setTimeout(resolve, secs * 1000));
}

// ======== function to create a lambda ============
async function CreateLambda(name)
{
	try {
		//create the package
		const file = new AdmZip();	
		file.addLocalFile(constants.ROOT+'/api/src/' + name + '.js');
		file.addLocalFile(constants.ROOT+'/api/src/providers.js');
		file.addLocalFile(constants.ROOT+'/api/src/constants.js');
		file.addLocalFolder(constants.ROOT+'/api/src/node_modules', 'node_modules');
		file.writeZip(constants.ROOT+'/api/src/' + name + '.zip');		

		// read the lambda zip file  
		const filecontent = fs.readFileSync(constants.ROOT+'/api/src/' + name + '.zip');

		//create the lambda
		const params = {
			Code: {
				ZipFile: filecontent
			},
			FunctionName: name,
			Handler: name + '.handler',
			Role: 'arn:aws:iam::' + process.env.AWS_ACCOUNT_ID + ':role/healthylinkx-lambda',
			Runtime: 'nodejs12.x',
			Description: name + ' lambda'
		};
		const lambda = new LambdaClient({});				
		var data = await lambda.send(new CreateFunctionCommand(params));
		FunctionArn = data.FunctionArn;
		console.log('Success. ' + name + ' lambda created.');

		//remove the package created
		await fs.unlinkSync(constants.ROOT + '/api/src/' + name + '.zip');

		//give lex permission to execute the lambda
		await lambda.send(new AddPermissionCommand({
			Action: 'lambda:InvokeFunction',
			FunctionName: name,
			Principal: 'lex.amazonaws.com',
			//SourceArn: 'arn:aws:lex:' + process.env.AWS_REGION + ':'+ process.env.AWS_ACCOUNT_ID + ':intent:SearchDoctors:*',
			SourceArn: 'arn:aws:lex:' + process.env.AWS_REGION + ':'+ process.env.AWS_ACCOUNT_ID + ':bot-alias/*',
			StatementId: 'AllowLexAccess'
		}));
		console.log('Success. Allowed lex to access the lambda');
		
		return FunctionArn;
		
	} catch (err) {
		console.log("Error. ", err);
		throw err;
	}
}

// ====== create lambdas  =====
async function APICreate() {

	try {
		//create a IAM role under which the lambdas will run
		const iamclient = new IAMClient({});
		const roleparams = {
			AssumeRolePolicyDocument: '{"Version": "2012-10-17","Statement": [{ "Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]}',
			RoleName: 'healthylinkx-lambda'
		};
		await iamclient.send(new CreateRoleCommand(roleparams));
		console.log("Success. IAM role created.");
		// wait a few seconds till the role is created. otherwise there is an error creating the lambda
		await sleep(10);

		//URL of the database
		const rdsclient = new RDSClient({});
		data = await rdsclient.send(new DescribeDBInstancesCommand({DBInstanceIdentifier: 'healthylinkx-db'}));
		const endpoint = data.DBInstances[0].Endpoint.Address;
		//const endpoint = '0.0.0.0';
		console.log("DB endpoint: " + endpoint);

		// create contants.js with env values
		fs.copyFileSync(constants.ROOT+'/api/src/constants.template.js', constants.ROOT+'/api/src/constants.js');
		const options = {
			files: constants.ROOT+'/api/src/constants.js',
			from: ['ENDPOINT', 'DBUSER', 'DBPWD'],
			to: [endpoint, constants.DBUSER, constants.DBPWD]
		};
		await replace(options);
		console.log("Success. Constants updated.");
		
		// install api node language dependencies
		await exec(`cd ${constants.ROOT}/api/src; npm install`);

		//create the lambda
		const taxonomyLambdaArn = await CreateLambda('healthylinkx-bot-lambda');
			
		// cleanup of files created	
		await fs.unlinkSync(constants.ROOT + '/api/src/package-lock.json');
		await fs.unlinkSync(constants.ROOT + '/api/src/constants.js');
		await fs.rmSync(constants.ROOT + '/api/src/node_modules', { recursive: true });

		console.log('Success. Lambdas created');

	} catch (err) {
		console.log("Error. ", err);
	}
}

module.exports = APICreate;
