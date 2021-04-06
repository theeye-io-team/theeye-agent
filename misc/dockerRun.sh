clientId=${THEEYE_CLIENT_ID}
clientSecret=${THEEYE_CLIENT_SECRET}
clientCustomer=${THEEYE_CLIENT_CUSTOMER}
clientHostname=${THEEYE_CLIENT_HOSTNAME}
apiUrl="https://supervisor.theeye.io"
debug="*eye*"
name="${clientCustomer}"
image="theeye-agent:slim"

docker run  --memory=512m -e NODE_ENV='production' \
  -e THEEYE_SUPERVISOR_CLIENT_ID="${clientId}" \
  -e THEEYE_SUPERVISOR_CLIENT_SECRET="${clientSecret}"  \
  -e THEEYE_SUPERVISOR_CLIENT_CUSTOMER="${clientCustomer}"  \
  -e THEEYE_CLIENT_HOSTNAME="${clientHostname}" \
  -e THEEYE_SUPERVISOR_API_URL="${apiUrl}" \
  -e DEBUG="${debug}" \
  -v /home/facugon/workspace/theeye/theeye-mailbot:/opt/theeye/theeye-mailbot \
  --name "${name}" --restart always -d "${image}"
