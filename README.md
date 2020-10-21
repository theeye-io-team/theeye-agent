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


## Docker Build

```shell

wd='./theeye-agent'

git clone git@github.com:theeye-io/theeye-agent.git ${wd}

cd ${wd}

docker build . -f Dockerfile.build --tag theeye/agent:$(git describe)

docker run --rm -dit --name theeye-agent-build -v ${PWD}/bin:/output theeye/agent:$(git describe) cp -r /src/theeye/agent/bin/. /output

```

It will create the directory `./bin`


## Docker Version

```
docker run theeye/agent:$(git describe) cat /src/theeye/agent/bin/release | grep Agent.Version
```
