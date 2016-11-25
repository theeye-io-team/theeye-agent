
# How to run scripts

The agent will parse the last line of the scripts looking for a string which represents a `state` or a `json` result object.

A `state` could be any state or event linked to the task or monitor of this script. Default build-in events are `success` and `failure`.

So if your scripts ended ok, in bash you have to `echo "ok"` as the last output of your script. 

> `success`, `normal` and `ok` are valid `success` states.    

> `failure`, `fail` and `error` are valid `failure` states.    


## Some code

This is a simple check with success or failure 


```sh

# Some comands and checks here

# ...

# And at the end of the script...

if [ $check == true ]; then
  echo "success"
else
  echo "failure"
fi

```

If you need to report extra information to the api, you need to add that information to output in json format like this


```sh

varUno="value1"
varTwo="value2"

# This will output valid JSON and will be parsed by the agent
if [ true ]; then
  echo { \"state\":\"success\", \"data\":{ \"val1\":$varTwo, \"val2\":$varUno } }
else
  echo { \"state\":\"failure\", \"data\":{ \"val1\":$varTwo, \"val2\":$varUno } }
fi

```

The JSON output needs to include a `state` property with the final state, and a `data` property with any extra information you want to send to the api.


If you need to validate the JSON output of your scripts, you can use this simple nodejs script as an example - there are a few and nice web application that can validate JSON for you too. Change it for your case

`test_json.js`

```js

// test.js
var exec = require('child_process').exec;

exec('./output.sh', function(err, stdout, stderr){
    var obj = JSON.parse(stdout);

    // if the stdout string was parsed successfuly the next sentence will give the members number - which is 1
    console.log( obj.data );
});

```

and the `test.sh` script looks like this

```sh

#!/bin/bash

state='normal'
POOL='pool'
members=1

# this is valid json when send to stdout
echo { \"state\" : \"$state\" , \"data\" : { \"members\" : $members } }
# this will echo { "state": "normal" , "data" : { "members": 1 } }

```

There are a lot of sample scripts, written in different languages wich are in production today.

Check our [TheEye-io gist](https://gist.github.com/theeye-io) scripts page.

Some samples

> [Powershell](https://gist.github.com/theeye-io/ed1f2407b3d3aae90a69af064c3e204a)      
> [NodeJS](https://gist.github.com/theeye-io/6435db167f4a681d1e9a7359d87aef6d)        
> [Bash](https://gist.github.com/theeye-io/4435b229ad06d3fd166a0818ef271029)        
> [Batch](https://gist.github.com/theeye-io/ebefc07b69eedb0a7c67d5626b0d76d7)       
