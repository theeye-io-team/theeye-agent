clientId=${THEEYE_CLIENT_ID}
clientSecret=${THEEYE_CLIENT_SECRET}
clientCustomer=${THEEYE_CLIENT_CUSTOMER}
clientHostname=${THEEYE_CLIENT_HOSTNAME}
debug="*eye*"
name="${clientCustomer}"

for i in "$@"
do
	case $i in
		-u=*|--url=*)
			API_URL="${i#*=}"
			shift # past argument=value
			;;
		-i=*|--image=*)
			IMAGE="${i#*=}"
			shift # past argument=value
			;;
		--default)
			DEFAULT=YES
			shift # past argument with no value
			;;
		*)
			# unknown option
			;;
	esac
done

if [ -z ${IMAGE+x} ];
then
	echo "docker image required. use: -i|--image="
	exit
fi

if [ -z ${API_URL+x} ];
then
	echo "supervisor url required. use: -u|--url="
	exit
fi

docker run  --memory=512m -e NODE_ENV='production' \
  -e THEEYE_SUPERVISOR_CLIENT_ID="${clientId}" \
  -e THEEYE_SUPERVISOR_CLIENT_SECRET="${clientSecret}"  \
  -e THEEYE_SUPERVISOR_CLIENT_CUSTOMER="${clientCustomer}"  \
  -e THEEYE_CLIENT_HOSTNAME="${clientHostname}" \
  -e THEEYE_SUPERVISOR_API_URL="${API_URL}" \
  -e DEBUG="${debug}" \
  -v /home/facugon/workspace/theeye/theeye-mailbot:/opt/theeye/theeye-mailbot \
  --name "${name}" --restart always -d "${IMAGE}"
