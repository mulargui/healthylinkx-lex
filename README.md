# healthylinkx-lex
Healthylinkx helps you find doctors with the help of your social network. Think of Healthylinkx as a combination of Yelp, Linkedin and Facebook.

This is an early prototype that combines open data of doctors and specialists from the US Department of Health. It allows you to search for doctors based on location, specialization, genre or name. You can choose up to three doctors in the result list and Healthylinkx (theoretically) will book appointments for you.

Healthylinx is a classic three tiers app: front-end (ux), service API and data store. This architecture makes it very adequate to test different technologies and I use it for getting my hands dirty on new stuff. Enjoy!

This repo implements Healthylinkx using an AWS Lex bot as the front end. For each tier of the app, we use different AWS resources: RDS for the datastore, Lambda for the API and Lex for the front-end.

To know more about the datastore this repo has more details https://github.com/mulargui/healthylinkx-mysql.git
Likewise about the API using Lambda https://github.com/mulargui/healthylinkx-serverless.git

The healthylinkx-cli.sh shellscript allows you to create, update or delete any of the three tiers of the app in AWS. To work you need to have installed locally npm, nodejs and mysql-client. Even more, there is a docker-healthylinkx-cli.sh shellscript that creates a docker image with these components. In this case you only need to have docker locally.

In order to access AWS you need to have environment variables with your account secrets. Use something like
export AWS_ACCESS_KEY_ID=1234567890
export AWS_SECRET_ACCESS_KEY=ABCDEFGHIJKLMN
export AWS_ACCOUNT_ID=1234567890
export AWS_DEFAULT_REGION=us-east-1
export AWS_REGION=$AWS_DEFAULT_REGION

Directories and files
healthylinkx-cli.sh - this is the command line interface
docker-healthylinkx-cli.sh - likewise but using docker
/infra/src - healthylinkx-cli app source code to install, uninstall and update the whole app
/infra/src/envparams.ts - All the parameters of the app, like datastore password... Fill in your data and save it before proceeding if you want to change the default values.
/docker - dockerfile of the container

The API is implemented as a lambda written in nodejs. We just adapted the Lambda we had before to support Lex call format
/api/src - source code of the Lambda (node js)

The datastore is a RDS MySql instance and healthylinkx-cli creates the instance and uploads the data
/datastore/data - dump of the healthylinkx database (schema and data)

The ux is an AWS Lex bot that is created by healthylinkx-cli. I looked for AWS Lex components to embed in a web page and provide a nice interface. All I found requires a lot of scaffolding and integration with AWS Cognito. I chose to make things simpler for this first iteration and use the AWS Lex console testing component instead. Adding a webpage with a conversational component can be a great future project.

In order to use the AWS Lex console testing you need to follow these steps once you are in the console:
Lex > Bots > Bot: healthylinkx-bot > Aliases > Alias: healthylinkx-bot-prod
Once there please mark Alias language support: English (US) and click on Test. This will open a conversational component that you can use to have a conversation with the bot.

The result of the bot is in the form of an HTML table that I expect to use in the future for a nicer interface and further functionality.

At this time I only implemented to search for doctors by name, zipcode and gender. I'm a rookie in conversational interfaces, I have more experience in CLI or graphics (GUI or web) interfaces, and I struggle a little bit to define the conversation. This is quite basic but all the scalffolding is in place and is trivial to iterate and add more conversational features as I see fit. I plan to extend this interface in the future.
