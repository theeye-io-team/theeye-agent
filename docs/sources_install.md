# TheEye Bot

[![theeye.io](/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)

## Manual Instalation from sources

### Before Start

* Is not mandatory, but your will get more benefits if you install the agent with admin privileges *root* administrator.   
* [NodeJS](https://nodejs.org/en/)
    * minimal v0.12 (can stopped working eventually). 
    * v8 recommended    
* NPM 
    * Part of the node toolkit. 
    * Version 3 or higher    

This how-to was written for Linux users. But if your platoform can run nodejs, then you can install the agente and will work. Please, contact us if you need support.

### Step 1.

create a directory to contain the agent. we use `/opt/theeye-agent`

```bash
mkdir /opt/theeye-agent
```

Download the sources (*lastest - production version*).

```bash
cd /opt/; git clone https://github.com/theeye-io/theeye-agent
```

### Step 2.

Create a configuration file using the default empty template

```bash
mkdir /etc/theeye; cp /opt/theeye-agent/misc/theeye/theeye.conf /etc/theeye/theeye.conf
```

### Step 3.

Setup the configuration file

OPTIONAL. Get the agent version and update the config file with it. The will be reported from the web panel

```bash
git describe
```

This is the configuration file. You would get the values to fill in from the [Web](https://theeye.io/profile)

```bash
#!/bin/bash
# export all vars hereunder
set -a
THEEYE_SUPERVISOR_CLIENT_ID=''
THEEYE_SUPERVISOR_CLIENT_SECRET=''
THEEYE_SUPERVISOR_CLIENT_CUSTOMER=''

# were to put the downloaded scripts
THEEYE_AGENT_SCRIPT_PATH='/opt/theeye-agent/scripts'

#
# Execution logging level. Don't change in production unless you know what are doing.
# If you need to increase debug level check this link for more information
# Link: https://www.npmjs.com/package/debug
# 
# default is to output only errors
#THEEYE_AGENT_DEBUG='eye:*:error'
THEEYE_AGENT_DEBUG='eye:*:error'

# You will probably need this to be reported.
# If you download the source get the version with `git describe` and update
THEEYE_AGENT_VERSION=''

# This is the api url. You will need one. https://app.theeye.io
THEEYE_SUPERVISOR_API_URL=''

# If you need to use a proxy, it is time to set it
#http_proxy=""
#https_proxy=""

# Environment
NODE_ENV='production'
```

### Step 4.

Install dependencies

```bash
cd /opt/theeye; npm install
```

### Step 5.

Run the agent.

```bash
cd /opt/theeye; ./run.sh
```

## Optional Arguments.

Optional arguments are passsed via shell environment.

`THEEYE_CLIENT_HOSTNAME='myawesomehost.com' ./run.sh`

If you want to use any option as a default settings, you can set it in the config file.

### More Options.

to set a custom hostname. this will be used to register the agent and the host agains the api. hostname-customer combination **MUST** be unique.

> THEEYE\_CLIENT\_HOSTNAME='the\_hostname\_you\_want'

### Offline Installation

#### Step 1.

Download the sources [linux agent 64](https://s3.amazonaws.com/theeye.agent/linux/theeye-agent64.tar.gz).

```bash
cd /opt/; sudo tar -xvf ./theeye-agent64.tar.gz
```

#### Step 2.

create a configuration file using the default empty template

```bash
mkdir /etc/theeye; cp /opt/theeye-agent/misc/theeye/theeye.conf /etc/theeye/theeye.conf
```

#### Step 3.

```bash
run /opt/theeye-agente/runBinary.sh
```

