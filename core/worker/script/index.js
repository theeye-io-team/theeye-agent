'use strict'

const Script = require('../../lib/script')
const AbstractWorker = require('../abstract')
const join = require('path').join
const scriptsConfig = require('config').scripts
const logsConfig = require('config').logs

module.exports = AbstractWorker.extend({
  initialize () {
    //var directory = process.env.THEEYE_AGENT_SCRIPT_PATH
    let directory = scriptsConfig.path
    let date = new Date()
    let config = this.config.script

    let logging_path
    if (this.config.script.logging === true || logsConfig.global === true) {
      logging_path = `${logsConfig.path}/script_${config.id}_${config.filename}_${date.toISOString()}.log`
    }

    this.script = new Script({
      id: config.id,
      args: config.arguments || [],
      runas: config.runas,
      env: config.env,
      blank_env: config.blank_env,
      timeout: config.timeout,
      md5: config.md5,
      dirname: directory,
      basename: config.filename,
      path: join(directory, config.filename),
      logging_path
    })
  },
  checkScript (next) {
    var self = this

    this.script.checkAccess(function (err) {
      if (err) { // no access to file
        if (err.code === 'ENOENT') { // file does not exists
          self.downloadScript(next)
        } else { // this is worst, can't access file at all, permissions maybe?
          return next(err)
        }
      } else {
        // no error, check md5
        self.script.checkMd5(function (err) {
          if (err) {
            if (err.code === 'EMD5') {
              self.downloadScript(next)
            } else { // validation error unknown
              return next(err)
            }
          } else {
            self.debug.log('script is ok')
            next()
          }
        })
      }
    })
  },
  downloadScript (done) {
    var self = this
    this.debug.log('getting script %s', this.script.id)
    var stream = this.connection.scriptDownloadStream(this.script.id)

    this.debug.log('download stream')
    this.script.save(stream, function (error) {
      if (error) {
        self.debug.error(error)
        return done(error)
      }
      self.debug.log('script downloaded')
      done()
    })
  },
  getData (next) {
    var self = this

    this.checkScript(function (error) {
      if (error) {
        self.debug.error(error)
        return next(null, {
          state: 'failure',
          data: {
            lastline: error.message,
            log: error.stack
          }
        })
      }

      self.script.run(function (result) {
        const data = Object.assign({}, result)
        let jsonLastline, payload, output = null, state = null 

        if (result.killed) {
          state = 'killed'
        } else {
          try {
            // try to parse lastline string as JSON output
            jsonLastline = JSON.parse(result.lastline)

            // looking for state and output
            if (isObject(jsonLastline)) {
              if (jsonLastline.state) {
                state = jsonLastline.state
              } else {
                state = null
              }
              output = (jsonLastline.output || jsonLastline.data || jsonLastline)
            } else if (Array.isArray(jsonLastline)) {
              state = undefined // undefined
              output = jsonLastline
            } else if (typeof jsonLastline === 'string') {
              state = jsonLastline
              output = jsonLastline
            } else {
              self.debug.log('unhandled ' + jsonLastline)
              // ???
            }

            data.output = output // force data.output
          } catch (e) {
            // if it is not a JSON
            self.debug.log('failed to parse lastline as JSON')
            self.debug.log(e.message)
            state = result.lastline // a string
          }
        }

        payload = { state, data }

        self.debug.data('execution result payload is %j', payload)

        return next(null, payload)
      })
    })
  }
})

const isObject = (value) => {
  return Object.prototype.toString.call(value) === '[object Object]'
}
