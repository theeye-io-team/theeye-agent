# Raspberry

[![theeye.io](/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)

To get the theeye agent to work on Raspberry, you need to install node and download the source code from github.

## Installation of Node JS

*All the commands are being executed as if it were root.

The list of commands in order would be the following

1. First install node. 

2. Get root

```bash
sudo su -
```

3. It is convenient to update the raspberry system

```bash
apt full-upgrade -y
```

4. Download and configure node to be installed

```bash
curl -sL https://deb.nodesource.com/setup_8.x | bash -
```

5. Install with apt

The build-essential package is necessary for the installation of some npm packages to work. Git we will need it later to download the source code of the agent.

```bash
apt-get install -y nodejs
apt-get install -y build-essential git
```

With this, node must be installed.

6. Verify node installation

```text
$ npm -v
6.4.1
$ node -v
v8.14.0
```
## Agent installation

For this we need to install the git command. We are going to install the agent in the directory `/opt/theeye-agent`

```bash
cd /opt
git clone https://github.com/theeye-io/theeye-agent.git
cd ./theeye-agent
```

We run the installer to download the dependencies

```text
npm install
```

With this the agent is already installed and ready to work.

### Create agent configuration file

First you have to enter the web interface of theeye [app.theeye.io](https://app.theeye.io) and then enter the following link to obtain the access credentials.

[link a credentials.json](https://app.theeye.io/api/agent/credentials)

This file contains the credentials that the agent needs to be able to connect to the system and function.

Create agent configuration file

```text
mkdir /etc/theeye
cp /opt/theeye-agent/misc/theeye.conf /etc/theeye
vim /etc/theeye/theeye.conf
```

Modify the contents of the file or replace it with the following:

```text
#!/bin/bash
set -a
THEEYE_SUPERVISOR_CLIENT_ID=''
THEEYE_SUPERVISOR_CLIENT_SECRET=''
THEEYE_SUPERVISOR_CLIENT_CUSTOMER=''
THEEYE_SUPERVISOR_API_URL=''
THEEYE_AGENT_DEBUG='*eye:error*'
THEEYE_AGENT_BINARIES_PATH='/opt/theeye-agent/bin'
THEEYE_AGENT_SCRIPT_PATH='/opt/theeye-agent/scripts'
THEEYE_CLIENT_HOSTNAME='raspberry'
NODE_ENV='production'
http_proxy=''
https_proxy=''
```

The values indicated below must be extracted from the credentials file and replaced in `theeye.conf`

> THEEYE\_SUPERVISOR\_CLIENT\_ID  
> THEEYE\_SUPERVISOR\_CLIENT\_SECRET  
> THEEYE\_SUPERVISOR\_CLIENT\_CUSTOMER  
> THEEYE\_SUPERVISOR\_API\_URL

The rest of the values do not need to be modified. For more information see [Installation Manual of the Agent](/)

## Service configuration

Once installed, we need to setup a system service which will start the agent every time you turn the Raspberry on and off.

Create the file `/etc/systemd/system/theeye-agent.service`. Copy and paste the contents of the following file [etc\_systemd\_system\_theeye-agent.service](/examples/etc_systemd_system_theeye-agent.service)

Create the file `/etc/init.d/theeye-agent` . Copy and paste the contents of the following file [etc\_init.d\_theeye-agent](/examples/etc_init.d_theeye-agent)

## Final Step

Restart the Raspberry

```text
shutdown -R now
```

If everything was configured correctly, the agent should start with the Raspberry and you can see the status in the interface.

If the Raspberry does not report we can try the [manual start with debug](/debug/)

# Common problems

1. If there was a problem with npm it is best, as root, to delete the directory `node_modules` and run the command again `npm install`.

```bash
sudo su -
cd /opt/theeye-agent
rm -rf ./node_modules
npm install
```
