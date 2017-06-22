'use strict';
var path = require('path');
require('./environment')(function(){
  var main ='eye:agent:main:error';
  var debug = require('debug')(main);

  process.on('SIGINT', function(){
    debug('agent process ends on "SIGINT"');
    process.exit(0);
  });
  process.on('SIGTERM', function(){
    debug('agent process ends on "SIGTERM"');
    process.exit(0);
  });
  process.on('exit', function(){ // always that the process ends, throws this event
    debug('agent process ends on "process.exit"');
    process.exit(0);
  });
  process.on('uncaughtException', function(error){
    debug('agent process on "uncaughtException"');
    debug(error);
    //process.exit(0);
  });

  var app = require('./app');
  app.start({},function(){ });
});
