var path = require('path');
global.APP_ROOT = path.resolve(__dirname);

require('./environment').setenv(function(){
  //require("newrelic");
  var main ='eye:agent:main';
  var debug = require('debug')(main);

  process.on('SIGINT', function(){
    debug('agent process ends on "SIGINT"');
    process.exit(0);
  });
  process.on('SIGTERM', function(){
    debug('agent process ends on "SIGTERM"');
    process.exit(0);
  });
  process.on('uncaughtException', function(error){
    debug('agent process on "uncaughtException"');
    debug(error);
    //process.exit(0);
  });
  process.on('exit', function(){ // always that the process ends, throws this event
    debug('agent process ends on "process.exit"');
    process.exit(0);
  });

  var app = require('./app');
  app.initializeSupervisorCommunication(function(){
    app.getConfiguration();
  });
});
