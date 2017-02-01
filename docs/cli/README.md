
# How to use the CLI

The CLI is a command line utility based on the Agent Core. Basically with the CLI, you can perform authenticated request to the API and create custom clients or automated tasks from any command line shell.


The CLI accepts the same environment variables as the agent do.

> DEBUG
> NODE_ENV
> THEEYE_CLIENT_HOSTNAME
> THEEYE_SUPERVISOR_API_URL
> THEEYE_SUPERVISOR_CLIENT_ID
> THEEYE_SUPERVISOR_CLIENT_SECRET
> THEEYE_SUPERVISOR_CLIENT_CUSTOMER
> THEEYE_AGENT_SCRIPT_PATH
> http_proxy
> https_proxy


It also works with the agent configuration file.


## A simple example


```

 /opt/theeye-agent/> ./cli/theeye-cli.js --help

  Usage: theeye-cli [options]

  Options:

    -h, --help                                     output usage information
    -V, --version                                  output the version number
    -a, --action [create|get|update|patch|remove]  Resource action
    -r, --resource [name]                          Remote resource name
    -p, --path [path]                              Full remote resource path
    -b, --body [jsonText]                          Request body params in json format
    -q, --query [jsonText]                         Request query string in json format


```

The following command will fetch all your available monitors


`NODE_ENV=cfgfilename ./cli/theeye-cli.js -a get -r resource`


Note that you will be able to perform only actions authorized to the user you are using.
Agents for example, have limited permissions.
To perform advanced actions (like create, delete or update) you will need a user with admin or higher permissions.

