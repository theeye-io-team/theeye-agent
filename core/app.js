'use strict';

var ip = require('ip');
var os = require('os');
var debug = require('debug')('eye:agent:app');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var TheEyeClient = require('./lib/theeye-client') ;
var Worker = require('./worker');
var hostname = require('./lib/hostname');

function App () {

  EventEmitter.call(this);

  var self = this;

  var supervisor = require('config').supervisor||{};
  supervisor.hostname = hostname;
  supervisor.proxy = require('config').proxy||undefined;

  var _host_id;
  var _host_resource_id;
  var _connection = new TheEyeClient(supervisor);
  var _workers = [];

  Object.defineProperty(this,'connection',{
    get:function(){ return _connection; }
  });

  Object.defineProperty(this,'workers',{
    get:function(){ return _workers; }
  });

  function connectSupervisor (next) {
    _connection.refreshToken(function(error,token){
      if(error) {
        debug('unable to get an access token');
        debug(error);
        next(error);
      } else {
        _connection.registerAgent({
          version: process.env.THEEYE_AGENT_VERSION,
          info:{
            platform: os.platform(),
            hostname: hostname,
            arch: os.arch(),
            os_name: os.type(),
            os_version: os.release(),
            uptime: os.uptime(),
            ip: ip.address()
          }
        },function(error,response){
          _host_id = response.host_id;
          _host_resource_id = response.resource_id;

          if(error) {
            debug(error);
            next(error);
          } else {
            debug(response);
            next(null);
          }
        });
      }
    });
  }

  // every 30 seconds retry;
  var interval = 30 * 1000;
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

  /**
   *
   * DEPRECATED
   *
  function searchConfigurationFiles (doneFn){
    if (_workers.length == 0) {
      debug('no workers configuration difined by supervisor');
      debug('searching workers configuration in files');

      var workerscfg = require('config').workers;
      if (!Array.isArray(workerscfg)||workerscfg.length==0) {
        debug('no workers defined via config');
      } else {
        debug('starting workers defined via config');
        for (var index in workerscfg) {
          var config = workerscfg[index];
          config.resource_id = _host_resource_id;
          var worker = Worker.spawn(config, _connection);
          worker.run();
        }
      }
    }

    if(doneFn) doneFn(null, _workers);
  }
  */

  function initListener () {
    var config = {
      resource_id: _host_resource_id,
      type: 'listener',
      looptime: require('config').workers.listener.looptime||15000
    }
    var worker = Worker.spawn(config, _connection);
    worker.run();
    return worker;
  }

  function setupWorkers (configs) {
    debug('intializing resource workers');
    configs.forEach(function(config) {
      var worker = Worker.spawn(config, _connection);
      worker.run();
      if(worker) _workers.push(worker);
    });
  }

  function getRemoteConfig (next) {
    debug('getting agent config');
    _connection.getAgentConfig(
      hostname, 
      function(error,config){
        var result = {
          data:{
            message: null,
          },
          state: ''
        };

        if (!config) {
          debug(msg);
          result.data.message = 'no agent configuration available';
          result.state = 'failure';
        } else {
          setupWorkers( config.workers );
          result.data.message = 'agent monitors updated';
          result.state = 'success';
        }

        //searchConfigurationFiles(doneFn);
        var listener = initListener();
        _workers.push(listener);

        debug('agent started');
        self.emit('config:up-to-date',result);
        if(next) next();
      }
    );
  }

  function updateWorkers () {
    debug('stopping current resource workers');
    _workers.forEach(function(worker,index){
      worker.stop();
      delete _workers[index];
      _workers[index] = null;
    });

    _workers = []; // destroy workers.

    debug('updating workers configuration');
    getRemoteConfig();
  }

  this.on('config:need-update',function(){
    updateWorkers();
  });

  this.start = function(specs,next) {
    tryConnectSupervisor(function(){
      getRemoteConfig(next);
    });
  }

  return this;
}

util.inherits(App, EventEmitter);

module.exports = new App();
