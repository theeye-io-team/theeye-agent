# THEEYE-CLIENT

This client handle authentication steps required to connect the api(theeye-supervisor), so you do not have to worry about that.

## PreRequisites

Register in theeye.io, get a customer and credentials to connect.    
You will be able to connect directly using your username and password.        

## How to use.

The client main purpose is to stablish the connection with the supervisor. For that end it need the connection credentials.

There are two ways of passing connection credentials. One is with configuration options via constructor. 

Following parameters are required:

> api_url     
> client_customer       
> client_id (username)       
> client_secret (password)      

the `access_token` is optional. you can provide it if you have one.


```javascript
// initialize credentials
var options = {
  api_url: https://api.theeye.io,
  client_id: fulanito,
  client_secret: mipassword,
  client_customer: facugon,
  access_token: null
};

var client = new TheEye(options);
// client is ready to make a call
```

The other way is by defining connection credentials via shell environment.

> THEEYE_SUPERVISOR_API_URL    
> THEEYE_SUPERVISOR_CLIENT_ID    
> THEEYE_SUPERVISOR_CLIENT_SECRET    
> THEEYE_SUPERVISOR_CLIENT_CUSTOMER    

```sh
THEEYE_SUPERVISOR_API_URL='https://api.theeye.io' node ./yourscript.js
```

then in `yourscript.js` just `require` and then instantiate the client:

`const client = new TheEye();`

If all the necesary data is set and correct, `client` will be ready to make requests to the API.

See the example script in `example` directory
