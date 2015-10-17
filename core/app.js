var app = new (require('events').EventEmitter);
var Connection = require("./connection") ;
var Worker = require("./worker");
var ip = require('ip');
var os = require('os');
var hostname = require('./lib/hostname');
var detectVersion = require('./lib/version');

var name = 'eye:agent:app';
var debug = require('debug')(name);

var connection ;
var workers = [] ;

app.connection = connection;
app.workers = workers;
app.initializeSupervisorCommunication = function (next)
{
  var config = require('config').get('supervisor');

  connection = new Connection(config);
  connection.refreshToken(function(error,token){
    if( error )
    {
      debug('unable to get an access token');
      debug(error);
      process.exit(-1);
    }
    else
    {
      connection.token = token ;

      // detect agent version
      detectVersion(function(error,version){
        debug('agent version %s', version);
        connection.registerAgent({
          version : error || !version ? 'unknown' : version,
          info : {
            platform   : os.platform(),
            hostname   : hostname,
            arch       : os.arch(),
            os_name    : os.type(),
            os_version : os.release(),
            uptime     : os.uptime(),
            ip         : ip.address()
          }
        },function(error,response){
          app.host_id = response.data.host_id;
          app.host_resource_id = response.data.resource_id;
          //app.setupKeepAliveWorker(response.data);

          if( error ) {
            debug(error);
            process.exit(-1);
          } else {
            debug(response);
            next();
          }
        });
      });
    }
  });
}

function checkWorkersConfiguration (doneFn){
  if(workers.length == 0){
    debug('no workers configuration difined by supervisor');
    debug('search workers configuration in files');

    var workerscfg = require('config').get('core').workers;
    if(!workerscfg || ! workerscfg instanceof Array || workerscfg.length == 0){
      debug('no workers defined via config');
    } else {
      for(var index in workerscfg) {
        var config = workerscfg[index];
        config.resource_id = app.host_resource_id;
        var worker = Worker.spawn(config, connection);
      }
    }
  }

  if(doneFn) doneFn(null, workers);
}

function initListener () {
  var config = {
    'resource_id': app.host_resource_id,
    'type': 'listener',
    'looptime': 15000
  }
  var worker = Worker.spawn(config, connection);
}

app.initializeAgentConfig = function(doneFn)
{
  debug('getting agent config');
  connection.getAgentConfig(
    hostname, 
    function(error,config){
      if( typeof config != 'undefined' && config != null ) {
        app.setupResourceWorkers( config.workers );
        var msg = 'agent monitor updated';
      } else {
        var msg = 'no agent configuration available';
        debug(msg);
      }

      checkWorkersConfiguration(doneFn);
      initListener();

      debug('agent started');
      app.emit('config:up-to-date',{msg:msg});
    });
}

app.setupSingleWorker = function(type)
{
  debug('intializing single worker');
  var workerscfg = require('config').get('core.workers');

  workerscfg.forEach(function(config){
    if(config.type == type){
      config.resource_id = app.host_resource_id;
      var worker = Worker.spawn(config, connection);
    }
  });
}

app.setupKeepAliveWorker = function(input)
{
  var worker = Worker.spawn({
    "resource_id": input.resource_id,
    "type": input.type,
    "looptime": input.looptime
  },connection);

  worker.config.resource_id = input.resource_id;
}

app.setupResourceWorkers = function(configs)
{
  debug('intializing resource workers');
  configs.forEach(function(config) {
    var worker = Worker.spawn(
      config, connection
    );
    workers.push(worker);
  });
}

app.updateResourceWorkers = function()
{
  debug('stopping current resource workers');
  workers.forEach(function(worker,index){
    worker.stop();
    delete workers[index];
    workers[index] = null;
  });

  app.workers = workers = []; // destroy workers.

  debug('updating workers configuration');
  app.initializeAgentConfig();
}

app.on('config:need-update',function(){
  app.updateResourceWorkers();
});

module.exports = app;
