'use strict'

const exec = require('child_process').exec
var debug = require('debug')('eye:lib:script')
var DEFAULT_EXECUTION_TIMEOUT = 10 * 60 * 1000
var File = require('../file')
var ScriptOutput = require('./output')
var util = require('util')
var fs = require('fs')
var crypto = require('crypto')
var path = require('path')
var shellescape = require('../shellescape')
var isDataUrl = require('valid-data-url')

const scriptsConfig = require('config').scripts

function Script (props) {

  File.apply(this, arguments)

  /**
   * Save base64 string into file content
   * @param {String} string content
   * @param {String} basename target path to drop the file
   * @return {String} returns the name with the extension
   */
  const base64str2file = (str, basename) => {
    try {
      if (!str.includes(';base64,')) {
        return null
      }

      const [ header, data ] = str.split(';base64,')
      const regex = /^data:.+\/(.+)/
      const matches = header.match(regex) 
      if (!matches) { return null }

      const ext = matches[1]
      const buffer = new Buffer(data, 'base64')

      const id = crypto.randomBytes(20).toString('hex')
      const filename = path.join(basename, id + '.' + ext)
      fs.writeFileSync(filename, buffer)

      return filename
    } catch (e) {
      return e.message
    }
  }

  /**
   * parse arguments, escape, trim. also ignore file arguments
   *
   * @param {Array} args
   * @return {String}
   */
  const prepareArguments = (args) => {
    var parsed
    try {
      if (Array.isArray(args) && args.length>0) {
        parsed = []
        args.forEach((arg, idx) => {
          if (isDataUrl(arg)) {
            let filename = base64str2file(arg, scriptsConfig.path)
            parsed.push(filename)
          } else if (arg === null || arg === undefined) {
            // escape spaces both for linux and windows
            parsed.push("")
          } else {
            parsed.push(arg)
          }
        })
        parsed = shellescape(parsed)
      } else {
        parsed = ''
      }
    } catch (e) {
      debug('error parsing script arguments')
      debug('%o', e)
    }
    return parsed
  }

  var _env
  if (props.blank_env === true) {
    _env = (props.env || {})
  } else {
    _env = Object.assign({}, process.env, props.env)
  }

  var _timeout = props.timeout
  var _runas = props.runas
  var _args
  var _output = null
  var _logging_path = props.logging_path

  Object.defineProperty(this, 'args', {
    get () { return _args },
    set (args) {
      _args = prepareArguments(args)
      return this
    },
    enumerable: true
  })
  Object.defineProperty(this, 'runas', {
    get () { return _runas },
    enumerable: true
  })
  Object.defineProperty(this, 'logging_path', {
    get () { return _logging_path },
    enumerable: true
  })
  Object.defineProperty(this, 'output', {
    get () { return _output },
    set (out) {
      _output = out
      return this
    },
    enumerable: true
  })
  Object.defineProperty(this, 'timeout', {
    get () { return _timeout },
    enumerable: true
  })
  Object.defineProperty(this, 'env', {
    get () { return _env },
    enumerable: true
  })

  _args = prepareArguments(props.args)
}

util.inherits(Script, File)

Script.prototype.run = function (end) {
  var partial = this.path + ' ' + this.args

  var formatted
  var runas = this.runas
  var regex = /%script%/
  // var regex = /['|"]?%script%['|"]?/

  if (runas && regex.test(runas) === true) {
    formatted = runas.replace(regex, partial)
    // formatted = runas.replace(regex, '"' + partial + '"')
  } else {
    formatted = partial
  }

  this.once('end', end)

  return this.execScript(formatted)
}

Script.prototype.execScript = function (script) {
  debug('running script "%s"', script)

  const self = this
  let partials = { stdout: [], stderr: [], log: [] }
  let execStart = process.hrtime()

  let execTimeout = this.timeout
  if (!execTimeout) {
    execTimeout = (
      scriptsConfig.timeout ||
      DEFAULT_EXECUTION_TIMEOUT
    )
  }

  let child = exec(script, {
    env: this.env || {},
    maxBuffer: scriptsConfig.max_buffer,
    timeout: execTimeout, // kill
    encoding: 'utf8'
  })

  if (this.logging_path) {
    let writeLogStream = fs.createWriteStream(this.logging_path)
    child.stdout.pipe(writeLogStream)
    child.stderr.pipe(writeLogStream)
    child.on('close', (code, signal) => {
      writeLogStream.end()
    })
  }

  child.stdout.on('data', function (data) {
    partials.stdout.push(data)
    partials.log.push(data)
  })

  child.stderr.on('data', function (data) {
    partials.stderr.push(data)
    partials.log.push(data)
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

    this.output = new ScriptOutput({
      code: code,
      stdout: partials.stdout.join(''),
      stderr: partials.stderr.join(''),
      log: partials.log.join('')
    })

    self.emit('end',
      Object.assign({}, this.output.toObject(), {
        signal,
        killed: (signal === 'SIGTERM' || child.killed),
        times: {
          seconds: exec_diff[0],
          nanoseconds: exec_diff[1]
        }
      })
    )
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

  return child
}

module.exports = Script
