"use strict";

var app = new (require('events').EventEmitter);
var TheEyeClient = require("theeye-client") ;
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

function connectSupervisor (next) {
  var config = require('config').get('supervisor');
  config.hostname = hostname;

  connection = new TheEyeClient(config);
  connection.refreshToken(function(error,token){
    if(error) {
      debug('unable to get an access token');
      debug(error);
      next(error);
    } else {
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
          app.host_id = response.host_id;
          app.host_resource_id = response.resource_id;

          if(error) {
            debug(error);
            next(error);
          } else {
            debug(response);
            next(null);
          }
        });
      });
    }
  });
}

var interval = 30 * 1000; // each 30 seconds retry
var attempts = 0;
function tryConnectSupervisor(nextFn){
  attempts++;
  connectSupervisor(function(error){
    if(!error) return nextFn();
    debug('connection failed. trying again in "%s" seconds', interval/1000);
    var timeout = setTimeout(function(){
      tryConnectSupervisor(nextFn);
    }, interval);
  });
}

app.initializeSupervisorCommunication = function (nextFn) {
  tryConnectSupervisor(nextFn);
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
  return worker ;
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
      var worker = initListener();
      workers.push( worker );

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

app.setupResourceWorkers = function(configs)
{
  debug('intializing resource workers');
  configs.forEach(function(config) {
    var worker = Worker.spawn(
      config, connection
    );
    if(worker) workers.push(worker);
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
