
# TheEye Agent.


## Linux How To

at the moments this are the supported distributions by the instalation script

> ubuntu   
> debian   
> centos   
> redhat   
> fedora   

### Prerequisites

go to theeye https://theeye.io and create and account. then go to the profile page and get the agent credentials.

there are no more requisites for the instalation script. for the Manual Installation see the step by step below.

## Script installation

> administrator permissions are required.   
> curl or wget (something to get the installation script)   

go to theeeye web > profile page (https://www.theeye.io/profile) , copy and run the curl.


## Manul instalation

### Pre Requisites.

> administrator permissions.   
> node js https://nodejs.org/en/ ( v0.12 or higher. v4 recomended )    
> npm (part of the node toolkit)    


### Step 1.

create a directory to contain the agent. eg. 

```sh
mkdir /opt/theeye-agent
```

download the source. 

```sh
cd /opt/; git clone https://github.com/interactar/theeye-agent
```

### Step 2.

create the configuration file using the default template

```sh
mkdir /etc/theeye; cp /opt/theeye-agent/misc/theeye/theeye.conf /etc/theeye/theeye.conf
```

### Step 3.

setup the configuration file

OPTIONAL. get the agent version and update the config with it

```sh
git describe
```

this is the configuration file. you would get the values to fill in from the web

```sh
#!/bin/bash
# export all vars hereunder
set -a
THEEYE_SUPERVISOR_CLIENT_ID=''
THEEYE_SUPERVISOR_CLIENT_SECRET=''
THEEYE_SUPERVISOR_CLIENT_CUSTOMER=''

# were to put the downloaded scripts
THEEYE_AGENT_SCRIPT_PATH='/opt/theeye-agent/scripts'

# log level. do not change to log only errors.
# use * only for debug , or the log file will fill very fast
THEEYE_AGENT_DEBUG='eye:*:error'

# you probably want this to be reported.
# if you download the source get the version with `git describe`
THEEYE_AGENT_VERSION=''

# this is the theeye api url.
THEEYE_SUPERVISOR_API_URL=''

# if you need a proxy it is time to set it
#http_proxy=""
#https_proxy=""

# Environment
NODE_ENV='production'
```

### Step 4.

install dependencies.

```sh
cd /opt/theeye; npm install
```

### Step 5.
run the agent.

```sh
cd /opt/theeye; ./run.sh
```

### Last note.

If the agent is running properly, you would probably want to setup a specific user to run it, create a start up script, give to the agent sudo rights. that depends on you linux distributions. I owe you that part.

## Optional Arguments.

optional arguments are passsed via shell env.

`THEEYE_CLIENT_HOSTNAME='myawesomehost.com' ./run.sh`

if you want to use any option as a default settings, you can set it in the config file.


### Options.

to set a custom hostname. this will be used to register the agent and the host agains the api. hostname-customer combination **MUST** be unique.

> THEEYE_CLIENT_HOSTNAME='the_hostname_you_want'



