var debug = require('debug')('eye:agent:listener:job:integrations:ngrok')
var Constants = require('../../../../constants');
var ngrok = require('../../../../lib/ngrok')
var config = require('config')

const OPERATION_START = 'start'
const OPERATION_STOP = 'stop'

const STATE_STARTED = 'started'
const STATE_STOPPED = 'stopped'

module.exports = function (specs, options) {
  var self = this

  this.id = specs.id
  this.specs = specs
  this.options = options

  this.selfManaged = true

  var tunnelURL
  Object.defineProperty(this, 'url', {
    get () {
      return tunnelURL
    }
  })

  var operation = specs.operation

  ngrok.configure({
    spawnCwd: config.binaries.path
  })

  function start (done) {
    debug('starting ngrok')
    ngrok.connect({
      authtoken: specs.authtoken,
      proto: specs.protocol,
      addr: Number(specs.address)
    }, function (err, url) {
      if (err) {
        debug('ngrok error. connect error')
        debug('%o', err)

        var err = {
          state: Constants.FAILURE_STATE,
          event: 'integration.ngrok.failed',
          data: {
            message: err.message,
            error_code: err.error_code,
            status_code: err.status_code,
            details: err.details
          }
        }

        return done(err)
      }
      tunnelURL = url
      done(null,{ state: STATE_STARTED, data: { url: tunnelURL } })
    })
  }

  function stop (done) {
    debug('stopping ngrok')
    ngrok.disconnect(tunnelURL) // stops one
    done(null,{ state: STATE_STOPPED, data: { url: tunnelURL } })
  }

  function error (done) {
    debug('restult error')
    var err = new Error('ngrok error. invalid operation')
    err.operation = operation
    done(err)
  }

  this.getResults = function (next) {
    debug('ngrok operation %s', operation)
    if (operation===OPERATION_START) return start(next)
    if (operation===OPERATION_STOP) return stop(next)
    error(next)
  }

  return this
}
