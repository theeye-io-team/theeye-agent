
require('./environment').setenv(function(){
  //require("newrelic");
  var main ='eye:agent:main';
  var debug = require('debug')(main);

  process.on('SIGINT', function(){
    debug('supervisor process ends on "SIGINT"');
    process.exit(0);
  });
  process.on('SIGTERM', function(){
    debug('supervisor process ends on "SIGTERM"');
    process.exit(0);
  });
  process.on('uncaughtException', function(error){
    debug('supervisor process on "uncaughtException"');
    debug(error);
    //process.exit(0);
  });
  process.on('exit', function(){ // always that the process ends, throws this event
    debug('supervisor process ends on "process.exit"');
    process.exit(0);
  });

  var app = require('./app');
  app.initializeSupervisorCommunication(
    function(){
      var worker ;
      if( worker = process.env.SINGLE_CORE_WORKER ) {
        app.setupSingleWorker(worker);
      } else {
        app.initializeAgentConfig();
      }
    }
  );
});
