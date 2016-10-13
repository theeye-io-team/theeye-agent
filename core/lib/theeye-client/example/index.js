'use strict';

const TheEye = require('theeye-client');

var config = require('./config');

var options = {
  'api_url': config.url,
  'client_id': config.clientid,
  'client_secret': config.secret,
  'client_customer': config.customer
};

var client = new TheEye(options);

console.log('connecting theeye api');
client.refreshToken((error,token)=>{
  if(error) console.log('ups...',error);
  else {
    console.log('Perfect! we have an access token "%s"', token);
    console.log('Now, lets fetch some hosts');
    client.hosts((error,hosts)=>{
      if(error) console.log('ups...', error);
      else {
        console.log('Hosts!');
        console.log(hosts);

        console.log('You are ready! Dont need me anymore. Bye');
      }
    });
  }
});
