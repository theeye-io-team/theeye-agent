const util = require('util')
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const isDataUrl = require('valid-data-url')
const spawn = require('child_process').spawn
const scriptsConfig = require('config').scripts
const logger = require('../logger').create('lib:script')
const mime = require('mime-types')

const DEFAULT_EXECUTION_TIMEOUT = 10 * 60 * 1000
const File = require('../file')
const ScriptOutput = require('./output')
const shellescape = require('../shellescape')

function Script (props) {

  File.apply(this, arguments)

  /**
   * Save dataurl encoded strings into files
   *
   * @param {String} string content
   * @param {String} basename target path to drop the file
   * @return {String} returns the name with the extension
   *
   */
  const base64str2file = (content, basename) => {
    try {
      if (!content.includes(';base64,')) {
        return null
      }

      //
      // References.
      //
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs#syntax
      //
      // data:[<mediatype>][;base64],<data>
      //

      const [ header, data ] = content.split(';base64,')
      const [ word, contentType ] = header.split(':')
      if (!contentType) { return null }

      const ext = mime.extension(contentType) || 'unk'
      const buffer = new Buffer(data, 'base64')

      const id = crypto.randomBytes(20).toString('hex')
      const filename = path.join(basename, `${id}.${ext}`)
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
    const parsed = []
    try {
      if (Array.isArray(args) && args.length>0) {
        for (let idx = 0; idx < args.length; idx++) {
          const arg = args[idx]

          if (isDataUrl(arg)) {
            const filename = base64str2file(arg, scriptsConfig.path)
            parsed.push(filename)
          } else if (arg === null || arg === undefined) {
            // escape spaces both for linux and windows
            parsed.push("")
          } else {
            parsed.push(arg)
          }
        }
      }
    } catch (e) {
      logger.error('error parsing script arguments')
      logger.error('%o', e)
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
  const regex = /%script%/

  // separate the interpreter
  const runasParts = this.runas.split(' ')
  let command = runasParts[0]
  let shell = false

  let args = []
  // old version using exec. exec can execute script using the path
  if (command === '%script%') {
    // use spawn with a shell like exec does
    shell = true
    command = this.path
    args = this.args
  } else {
    const commandArgs = runasParts.slice(1)
    for (let index = 0; index < commandArgs.length; index++) {
      const arg = commandArgs[index]
      // push args in order
      if (regex.test(arg) === true) {
        args.push(this.path)
        args = args.concat(this.args)
      } else {
        args.push(arg)
      }
    }
  }

  this.once('end', end)
  return this.spawnScript(command, args, { shell })
}

Script.prototype.spawnScript = function (cmd, args, options) {
  logger.debug('running command "%s" with args "%s"', cmd, args)

  const self = this
  const partials = {
    stdout: [],
    stderr: [],
    log: []
  }

  let execStart = process.hrtime()

  let execTimeout = this.timeout
  if (!execTimeout) {
    execTimeout = (
      scriptsConfig.timeout ||
      DEFAULT_EXECUTION_TIMEOUT
    )
  }

  const child = spawn(
    cmd,
    args,
    Object.assign({
      //cwd: ,
      env: this.env || {},
      timeout: execTimeout, // kill
    }, options)
  )

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
    logger.log('child emit close with %j', arguments)


    var exec_diff = process.hrtime(execStart)
    logger.log('times %j.', exec_diff)

    if (exec_diff[0] === 0) {
      logger.log('script end after %s msecs.', exec_diff[1] / 1e6)
    } else {
      logger.log('script end after %s secs', exec_diff[0])
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
    logger.error('child emit error with %j', err)
  })

  child.on('disconnect', function () {
    logger.error('script emit disconnect')
  })

  child.on('message', function () {
    logger.log('child emit message with %j', arguments)
  })

  return child
}

module.exports = Script
