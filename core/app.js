'use strict';

var ip = require('ip');
var os = require('os');
var util = require('util');
var debug = require('debug')('eye:agent:app');
var TheEyeClient = require('./lib/theeye-client');
var hostname = require('./lib/hostname');
var Worker = require('./worker');
var Listener = require('./worker/listener');
var config = require('config');

function App () {
  var self = this;

  var connection = config.supervisor||{};
  connection.hostname = hostname;
  connection.request = config.request;

  var _connection = new TheEyeClient(connection);
  var _host_id;
  var _host_resource_id;
  var _workers = [];

  Object.defineProperty(this,'connection',{
    get:function(){ return _connection; }
  });

  Object.defineProperty(this,'workers',{
    get:function(){ return _workers; }
  });

  function registerAgent (next) {
    _connection.create({
      route: _connection.HOST + '/:hostname',
      body: {
        version: process.env.THEEYE_AGENT_VERSION,
        info: {
          platform: os.platform(),
          hostname: hostname,
          arch: os.arch(),
          os_name: os.type(),
          os_version: os.release(),
          uptime: os.uptime(),
          ip: ip.address()
        }
      },
      success: function (response) {
        _host_id = response.host_id;
        _host_resource_id = response.resource_id;
        debug(response);
        next(null);
      },
      failure: function (err) {
        debug(error);
        next(error);
      }
    });
  }

  function connectSupervisor (next) {
    _connection.refreshToken(function (error,token) {
      if (error) {
        debug('unable to get an access token');
        debug(error);
        next(error);
      } else {
        registerAgent(next)
      }
    });
  }

  // every 30 seconds retry;
  var interval = 30 * 1000;
  var attempts = 0;
  function tryConnectSupervisor (nextFn) {
    attempts++;
    connectSupervisor(function(error){
      if (!error) return nextFn();
      debug('connection failed. trying again in "%s" seconds', interval/1000);
      var timeout = setTimeout(function(){
        tryConnectSupervisor(nextFn);
      }, interval);
    });
  }

  function initListener () {
    var worker = new Listener(_connection,{
      resource_id: _host_resource_id,
      type: 'listener',
      looptime: require('config').workers.listener.looptime||15000
    });
    worker.run();
    return worker;
  }

  function setupWorkers (configs) {
    debug('intializing resource workers');
    configs.forEach(function(config) {
      var worker = Worker.spawn(config, _connection);
      if (worker!==null) {
        worker.run();
        _workers.push(worker);
      }
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
          var msg = 'no agent configuration available';
          debug(msg);
          result.data.message = msg;
          result.state = 'failure';
        } else {
          setupWorkers( config.workers );
          result.data.message = 'agent monitors updated';
          result.state = 'success';
        }

        if (!self.listener) {
          self.listener = initListener();
          self.listener.on('config:outdated',function(){
            updateWorkers();
          });
        }

        debug('agent started');
        if(next) next(null,result);
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
    getRemoteConfig(function(err,result){
      self.listener.emit('config:updated',result);
    });
  }

  this.start = function(specs,next) {
    tryConnectSupervisor(function(){
      getRemoteConfig(next);
    });
  }

  this.startCLI = function(next){
    tryConnectSupervisor(function(){
      next()
    });
  }

  return this;
}

module.exports = new App();
