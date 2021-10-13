
const ip = require('ip')
const os = require('os')
const debug = require('debug')('eye:agent:app')
const TheEyeClient = require('./lib/theeye-client')
const hostnameFn = require('./lib/hostname')
const Worker = require('./worker')
const ListenerWorker = require('./worker/listener')
const PingWorker = require('./worker/ping')
const localConfig = require('config')
const WorkerConstants = require('./constants/worker')

const EventEmitter = require('events').EventEmitter

function App () {
  const app = this

  EventEmitter.call(this)

  this.on('config:outdated', () => updateWorkers())

  var connection = localConfig.supervisor || {}
  connection.hostnameFn = hostnameFn
  connection.request = localConfig.request

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
          hostname: hostnameFn(),
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

  function listenerConfigure (config) {
    config = (config || localConfig.workers.listener || {})
    if (!app.listener && config.enable !== false) {
      const worker = new ListenerWorker(app, _connection,
        Object.assign({}, config, {
          resource_id: _host_resource_id,
          type: WorkerConstants.Listener.type,
          looptime: (config.looptime || WorkerConstants.Listener.looptime)
        })
      )
      worker.run()
      app.listener = worker
    } else if (app.listener && app.listener.enable === true) {
      const listener = app.listener
      listener.stop()
      Object.assign(listener.config, config)
      listener.run()
      debug('listener reconfigured')
    }
  }

  function pingConfigure (config) {
    config = (config || localConfig.workers.ping || {})
    if (!app.ping && config.enable !== false) {
      const worker = new PingWorker(app, _connection, {
        resource_id: _host_resource_id,
        type: WorkerConstants.Ping.type,
        looptime: config.looptime || WorkerConstants.Ping.looptime
      })
      worker.run()
      app.ping = worker
    } else if (app.ping && app.ping.enable === true) {
      const ping = app.ping
      ping.stop()
      Object.assign(ping.config, config)
      ping.run()
      debug('ping reconfigured')
    }
  }

  function startCoreWorkers () {
    // always required
    listenerConfigure()
    pingConfigure()
  }

  function startWorkers (workersConfig) {
    //if (
    //  localConfig.workers.enable === false ||
    //  process.env.THEEYE_AGENT_WORKERS_DISABLED === 'true'
    //) {
    //  return debug('WARNING: Workers disabled')
    //}

    debug('intializing workers')
    workersConfig.forEach(function(config) {
      const worker = Worker.spawn(app, config, _connection)
      if (worker!==null) {
        worker.run()
        _workers.push(worker)
      }
    })
  }

  function getConfig (next) {
    debug('obtaining agent config')
    _connection.getAgentConfig(next)
  }

  function reconfigureWorkers (next) {
    getConfig((err, remoteConfig) => {
      var result = {
        data: { message: null },
        state: ''
      }

      if (!remoteConfig) {
        const msg = 'no workers configuration available'
        debug(msg)
        result.data.message = msg
        result.state = 'failure'
      } else {
        startWorkers(remoteConfig.workers)
        result.data.message = 'agent monitors updated'
        result.state = 'success'
        debug('workers configured')
      }

      if (next) {
        next(null, result)
      }
    })
  }

  function updateWorkers () {
    debug('stopping current resource workers')
    _workers.forEach(function(worker,index){
      worker.stop()
      delete _workers[index]
      _workers[index] = null
    })

    _workers = [] // destroy workers.

    debug('updating workers configuration')
    reconfigureWorkers(function(err, result){
      app.emit('config:updated', result)
      debug('workers configuration updated')
    })
  }

  function configureWorkers (next) {
    getConfig((err, configs) => {
      startWorkers(configs.workers)
      startCoreWorkers()
    })
  }

  this.start = function (next) {
    next || (next = () => {})
    tryConnectSupervisor(function(){
      configureWorkers(next)
    })
  }

  this.startCLI = function(next){
    tryConnectSupervisor(function(){
      next()
    })
  }

  return this;
}

Object.assign(App.prototype, EventEmitter.prototype)

module.exports = new App()
