'use strict'

var exec = require('child_process').exec
var debug = require('debug')('eye:lib:script')
var kill = require('tree-kill')
var config = require('config')
var DEFAULT_EXECUTION_TIMEOUT = 10 * 60 * 1000
var File = require('../file')
var ScriptOutput = require('./output')
var util = require('util')
var fs = require('fs');
var crypto = require('crypto')
var path = require('path')

function Script (props) {
  File.apply(this, arguments)

  /**
   * Save base64 string into file content
   * @param {String} string content
   * @param {String} basename target path to drop the file
   * @return {String} returns the name with the extension
   */
  const base64str2file = (str, basename) => {
    var regex = /^data:.+\/(.+);base64,(.*)$/;
    var matches = str.match(regex)
    let id = crypto.randomBytes(20).toString('hex')

    if (!matches) { return null }

    var ext = matches[1]
    var data = matches[2]
    var buffer = new Buffer(data, 'base64')

    let filename = path.join(basename, id + '.' + ext)
    fs.writeFileSync(filename, buffer)

    return filename
  }

  /**
   * parse arguments, escape, trim. also ignore file arguments
   *
   * @param {Array} args
   * @param {Array} specs
   * @return {String}
   */
  const prepareArguments = (args, specs) => {
    var parsed
    try {
      if (args && Array.isArray(args)) {
        parsed = []
        args.forEach((arg, idx) => {
          if (specs[idx].type === 'file') {
            let filename = base64str2file(arg, config.scripts.path)
            parsed.push(filename)
          } else {
            // escape spaces both for linux and windows
            parsed.push((/\s/.test(arg)) ? ('"' + arg + '"') : arg)
          }
        })
        parsed = parsed.join(' ')
      } else {
        parsed = ''
      }
    } catch (e) {
      debug('error parsing script arguments')
      debug('%o', e)
    }
    return parsed
  }

  var _runas = props.runas
  var _args
  var _output = null

  Object.defineProperty(this, 'args', {
    get: function () { return _args },
    set: function (args) {
      _args = prepareArguments(args, props.args_specs)
      return this
    },
    enumerable: true
  })
  Object.defineProperty(this, 'runas', {
    get: function () { return _runas },
    enumerable: true
  })
  Object.defineProperty(this, 'output', {
    get: function () { return _output },
    enumerable: true
  })

  _args = prepareArguments(props.args, props.args_specs)

  this.run = function (end) {
    var partial = this.path + ' ' + this.args
    var formatted
    var runas = this.runas
    var regex = /%script%/
    // var regex = /['|"]?%script%['|"]?/;

    if (runas && regex.test(runas) === true) {
      formatted = runas.replace(regex, partial)
      // formatted = runas.replace(regex, '"' + partial + '"');
    } else {
      formatted = partial
    }

    this.once('end', end)

    return this.execScript(formatted)
  }

  this.execScript = function (script, options) {
    debug('running script "%s"', script)

    options || (options = {})

    var execTimeout = (config.scripts && config.scripts.execution_timeout) || undefined
    if (!execTimeout) {
      execTimeout = options.timeout || DEFAULT_EXECUTION_TIMEOUT
    }

    var self = this
    var killed = false
    var partials = { stdout: '', stderr: '', log: '' }
    var execStart = process.hrtime()
    var child = exec(script, { env: options.env || {} })

    var timeoutId = setTimeout(function () {
      debug('killing child script ("%s")', script)
      killed = true
      kill(child.pid, 'SIGKILL', function (err) {
        if (err) debug(err)
        else debug('kill send')
      })
    }, execTimeout)

    this.once('end', function () {
      clearTimeout(timeoutId)
    })

    child.stdout.on('data', function (data) {
      partials.stdout += data
      partials.log += data
      self.emit('stdout', data)
    })

    child.stderr.on('data', function (data) {
      partials.stderr += data
      partials.log += data
      self.emit('stderr', data)
    })

    child.on('close', function (code, signal) {
      debug('child emit close with %j', arguments)

      var exec_diff = process.hrtime(execStart)
      debug('times %j.', exec_diff)

      if (exec_diff[0] === 0) {
        debug('script end after %s msecs.', exec_diff[1] / 1e6)
      } else {
        debug('script end after %s secs', exec_diff[0])
      }

      _output = new ScriptOutput({
        code: code,
        stdout: partials.stdout,
        stderr: partials.stderr,
        log: partials.log
      })

      self.emit('end', util._extend(
        _output.toObject(), {
          signal: signal,
          killed: Boolean(killed),
          times: {
            seconds: exec_diff[0],
            nanoseconds: exec_diff[1]
          }
        }
      ))
    })

    child.on('error', function (err) {
      debug('child emit error with %j', err)
    })

    child.on('disconnect', function () {
      debug('script emit disconnect')
    })

    child.on('message', function () {
      debug('child emit message with %j', arguments)
    })

    return self
  }
}

util.inherits(Script, File)

module.exports = Script
