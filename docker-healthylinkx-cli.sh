#check if the image is already built, if not build it
if [ "$(docker images | grep nodemysql)" == "" ]; then
	docker build -q --rm=true -t nodemysql $PWD/docker
fi

#similar to healthylinkx-cli.sh but running inside a container to avoid to install node, npm...
docker run -ti --rm -v $PWD:/healthylinkx-lex -w /healthylinkx-lex/ \
	-e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_ACCOUNT_ID \
	-e AWS_REGION -e AWS_DEFAULT_REGION nodemysql /bin/bash healthylinkx-cli.sh "$@"
