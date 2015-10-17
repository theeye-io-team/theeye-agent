require('./environment').setenv(function(){
  //require("newrelic");
  var main ='eye:agent:main';
  var debug = require('debug')(main);

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
