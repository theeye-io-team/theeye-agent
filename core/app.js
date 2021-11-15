
const ip = require('ip')
const os = require('os')
const debug = require('debug')('eye:agent:app')
const TheEyeClient = require('./lib/theeye-client')
const hostnameFn = require('./lib/hostname')
const Worker = require('./worker')
const ListenerWorker = require('./worker/listener')
const PingWorker = require('./worker/ping')
const appConfig = require('config')
const WorkerConstants = require('./constants/worker')

const EventEmitter = require('events').EventEmitter

function App () {
  const app = this

  app.config = appConfig

  EventEmitter.call(this)

  this.on('config:outdated', () => updateWorkers())

  const connection = appConfig.supervisor || {}
  connection.hostnameFn = hostnameFn
  connection.request = appConfig.request

  const _connection = new TheEyeClient(connection)
  const _workers = []

  // let _hostId
  let _hostResourceId

  Object.defineProperty(this, 'connection', {
    get: function () { return _connection }
  })

  Object.defineProperty(this, 'workers', {
    get: function () { return _workers }
  })

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
        // _hostId = response.host_id
        _hostResourceId = response.resource_id
        debug(response)
        next(null)
      },
      failure: function (err) {
        debug(err)
        next(err)
      }
    })
  }

  function connectSupervisor (next) {
    _connection.refreshToken(function (error, token) {
      if (error) {
        debug('unable to get an access token')
        debug(error)
        next(error)
      } else {
        registerAgent(next)
      }
    })
  }

  // every 30 seconds retry;
  const interval = 30 * 1000
  // let attempts = 0
  function tryConnectSupervisor (nextFn) {
    // attempts++
    connectSupervisor(function (error) {
      if (!error) return nextFn()
      debug('connection failed. trying again in "%s" seconds', interval / 1000)
      setTimeout(function () {
        tryConnectSupervisor(nextFn)
      }, interval)
    })
  }

  function listenerConfigure (config) {
    config = (config || appConfig.workers.listener || {})
    if (!app.listener && config.enable !== false) {
      const worker = new ListenerWorker(app, _connection,
        Object.assign({}, config, {
          resource_id: _hostResourceId,
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
    config = (config || appConfig.workers.ping || {})
    if (!app.ping && config.enable !== false) {
      const worker = new PingWorker(app, _connection, {
        resource_id: _hostResourceId,
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
    if (
      appConfig.workers.enable === false ||
      process.env.THEEYE_AGENT_WORKERS_DISABLED === 'true'
    ) {
      return debug('WARNING: Workers disabled')
    }

    debug('intializing workers')
    workersConfig.forEach(function (config) {
      const worker = Worker.spawn(app, config, _connection)
      if (worker !== null) {
        worker.run()
        _workers.push(worker)
      }
    })
  }

  function reconfigureWorkers (next) {
    _connection.getAgentConfig((err, remoteConfig) => {
      if (err) { return next(err) }

      const result = {
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
    _workers.forEach(function (worker, index) {
      worker.stop()
      delete _workers[index]
      _workers[index] = null
    })

    _workers.splice(0, _workers.length) // destroy workers.

    debug('updating workers configuration')
    reconfigureWorkers(function (err, result) {
      if (err) { return debug(err) }
      app.emit('config:updated', result)
      debug('workers configuration updated')
    })
  }

  function configureWorkers (next) {
    _connection.getAgentConfig((err, configs) => {
      if (err) { return next(err) }
      startWorkers(configs.workers)
      startCoreWorkers()
    })
  }

  this.start = function (next) {
    next || (next = () => {})
    tryConnectSupervisor(function () {
      configureWorkers(next)
    })
  }

  this.startCLI = function (next) {
    tryConnectSupervisor(function () {
      next()
    })
  }

  return this
}

Object.assign(App.prototype, EventEmitter.prototype)

module.exports = new App()
