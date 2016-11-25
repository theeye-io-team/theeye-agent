
# How to run scripts

The agent will parse the last line of the scripts looking for a string which represents a "state" or a "json" result object.

a "state" could be any state or event linked to the task or monitor of this script. default events are "success" and "failure".

so if your scripts ended ok, in bash you have to `echo "ok"` as the last output of your script.

```sh

if [ true ]; then
  echo "success"
else
  echo "failure"
fi

```


if you need to report information to the api you add more information to output in json format like this



```sh

varUno="value1"
varTwo="value2"

if [ true ]; then
  echo { \"state\":\"success\", \"data\":{ \"val1\":$varTwo, \"val2\":$varUno } }
else
  echo { \"state\":\"failure\", \"data\":{ \"val1\":$varTwo, \"val2\":$varUno } }
fi

```

the JSON object have to include a "state" property with the final state , and a "data" property with any extra information you want to send.


if you want to validate the JSON output of your scripts, you can use this simple nodejs script.
also there are a few web application that can validate JSON for you

`test_json.js`

```js

// test.js
var exec = require('child_process').exec;

exec('./output.sh', function(err, stdout, stderr){
    var obj = JSON.parse(stdout);
    console.log( obj.data );
});

```

the `test.sh` looks like this

```sh

#!/bin/bash

state='normal'
POOL='pool'
members=1

echo {\"state\":\"$state\",\"data\":{\"members\":$members}} # this is valid json when echoed

```
