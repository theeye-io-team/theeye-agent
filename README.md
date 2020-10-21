# TheEye Agent.

-----

## [DOCS](https://documentation.theeye.io/core-concepts/agent/sources_install/)

The default dockerfile uses theeye-agent's binary
For developing you may use dockerfile_sources wich install theeye-agent's sources files.


-----

## Agent env settings

### DEBUG

### NODE_ENV

### THEEYE_CLIENT_HOSTNAME

### THEEYE_SUPERVISOR_API_URL

### THEEYE_SUPERVISOR_CLIENT_ID

### THEEYE_SUPERVISOR_CLIENT_SECRET

### THEEYE_SUPERVISOR_CLIENT_CUSTOMER

### THEEYE_AGENT_SCRIPT_PATH

### THEEYE_AGENT_LOGS_PATH

### THEEYE_AGENT_WORKERS_DISABLED

### THEEYE_AGENT_SCRAPER_REGISTER_BODY

### http_proxy

### https_proxy


-----


## Docker Build Binary Agent

```shell

wd='./theeye-agent'

git clone git@github.com:theeye-io/theeye-agent.git ${wd}

cd ${wd}

docker build . -f Dockerfile.slim --tag theeye/agent:$(git describe)

docker run --rm -dit --name theeye-agent-build -v ${PWD}/bin:/output theeye/agent:$(git describe) cp -r /src/theeye/agent/bin/. /output

```

It will create the directory `./bin`

## Docker Build (with binary agent included and puppeteer)

```
docker build . --tag theeye/agent:$(git describe)
```

## Docker Version

```
docker run theeye/agent:$(git describe) cat /src/theeye/agent/bin/release | grep Agent.Version
```

## RUN From Docker

```bash
docker run \
   -e DEBUG="*eye*" \
   -e NODE_ENV="production" \
   -e THEEYE_SUPERVISOR_CLIENT_ID="client id" \
   -e THEEYE_SUPERVISOR_CLIENT_SECRET="client secret" \
   -e THEEYE_SUPERVISOR_CLIENT_CUSTOMER="customer name" \
   -e THEEYE_SUPERVISOR_API_URL="https://supervisor.theeye.io" \
   -e THEEYE_CLIENT_HOSTNAME="agent name" theeye/agent:$(git describe)
```
