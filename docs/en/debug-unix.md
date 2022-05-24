# Debug

[![theeye.io](/en/images/logo-theeye-theOeye-logo2.png)](https://theeye.io/en/index.html)

## PREREQUISITES

- access to the server
- root access
- last version of the binary agent installed with the installation script

## STEPS

1. login
2. if the agent is running, stop it. most linux distros `service stop theeye-agent`
3. change directory to the agent directory, usually `/opt/theeye-agent`
4. start the agent manually      
    * Binary agent       
    ```bash
    cd /opt/theeye-agent
    source /etc/theeye/theeye.conf && DEBUG=*eye* ./bin/theeye-agent
    ```
    * from sources
    ```bash
    cd /opt/theeye-agent
    source /etc/theeye/theeye.conf && DEBUG=*eye* npm run core
    ```




this will output all the agent activity to the terminal.

