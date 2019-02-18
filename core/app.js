'use strict';

var ip = require('ip');
var os = require('os');
var util = require('util');
var debug = require('debug')('eye:agent:app');
var TheEyeClient = require('./lib/theeye-client');
var hostname = require('./lib/hostname');
var Worker = require('./worker');
var ListenerWorker = require('./worker/listener');
var PingWorker = require('./worker/ping');
var localConfig = require('config');
var WorkerConstants = require('./constants/worker')

function App () {
  var self = this;

  var connection = localConfig.supervisor||{};
  connection.hostname = hostname;
  connection.request = localConfig.request;

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
        debug(err);
        next(err);
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

  function startListener () {
    var config = localConfig.workers.listener || {}
    if (!self.listener && config.enabled!==false) {

      const worker = new ListenerWorker(
        _connection, Object.assign({}, config, {
          resource_id: _host_resource_id,
          type: WorkerConstants.Listener.type,
          looptime: (config.looptime || WorkerConstants.Listener.looptime)
        })
      )

      worker.run()
      worker.on('config:outdated',function(){
        updateWorkers()
      })

      self.listener = worker
    }
  }

  function startPing () {
    var config = localConfig.workers.ping
    if (!self.ping && config.enabled!==false) {
      var worker = new PingWorker(_connection, {
        resource_id: _host_resource_id,
        type: WorkerConstants.Ping.type,
        looptime: config.looptime || WorkerConstants.Ping.looptime
      })
      worker.run()
      worker.on('config:outdated',function(){
        updateWorkers()
      })

      self.ping = worker
    }
  }

  function startCoreWorkers () {
    startListener()
    startPing()
  }

  function startWorkers (workersConfig) {
    if (
      localConfig.workers.enabled === false ||
      process.env.THEEYE_AGENT_WORKERS_DISABLED === 'true'
    ) {
      return debug('WARNING: Workers disabled')
    }

    debug('intializing workers')
    workersConfig.forEach(function(config) {
      var worker = Worker.spawn(config, _connection)
      if (worker!==null) {
        worker.run()
        _workers.push(worker)
      }
    })
  }

  function getRemoteConfig (next) {
    debug('obtaining agent config')
    _connection.getAgentConfig(
      hostname, 
      function (error, remoteConfig) {
        var result = {
          data: { message: null },
          state: ''
        }

        if (!remoteConfig) {
          var msg = 'no agent configuration available';
          debug(msg);
          result.data.message = msg;
          result.state = 'failure';
        } else {
          startWorkers( remoteConfig.workers );
          result.data.message = 'agent monitors updated';
          result.state = 'success';
        }

        if (next) { next(null, result) }
      }
    )
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
    configureAgent(function(err, result){
      if (self.listener) {
        self.listener.emit('config:updated', result);
      }
    })
  }

  function configureAgent (next) {
    getRemoteConfig((err, result) => {
      startCoreWorkers ()
      debug('agent configured')
      next(err, result)
    })
  }

  this.start = function (next) {
    next || (next = () => {})
    
    tryConnectSupervisor(function(){
      configureAgent(next)
    })
  }

  this.startCLI = function(next){
    tryConnectSupervisor(function(){
      next()
    })
  }

  return this;
}

module.exports = new App();
