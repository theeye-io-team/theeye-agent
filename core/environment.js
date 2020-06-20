
var fs = require('fs')
var config = require('config')
var debug = require('debug')('eye::environment')
var exec = require('child_process').exec
require('./lib/extend-error')

module.exports = function (next) {
  try {
    var env = process.env.NODE_ENV

    if (!env) {
      debug('no env set')
      process.exit()
    }

    createScriptsPath()
    createLogsPath()
  } catch (err) {
    return next (err)
  }

  detectAgentVersion(function(err, version){
    process.env.THEEYE_AGENT_VERSION = version
    debug('agent version is %s', process.env.THEEYE_AGENT_VERSION)
    next(err)
  })
}

function createScriptsPath () {
  var scriptsPath = (process.env.THEEYE_AGENT_SCRIPT_PATH || config.scripts && config.scripts.path)
  if (!scriptsPath) {
    scriptsPath = process.cwd() + '/../downloads'
  }

  config.scripts.path = scriptsPath
  debug('scripts path is %s', config.scripts.path)

  if (!fs.existsSync(scriptsPath)) {
    fs.mkdirSync(scriptsPath, '0755')
  }
  return scriptsPath
}

function createLogsPath () {
  let path = (process.env.THEEYE_AGENT_LOGS_PATH || config.logs && config.logs.path)
  if (!path) { path = process.cwd() + '/../logs' }

  if (!config.logs) { config.logs = {} }
  config.logs.path = path 
  debug('Logs path is %s', config.logs.path)

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, '0755')
  }
  return path
}

function detectAgentVersion (next) {
  var version = process.env.THEEYE_AGENT_VERSION
  if (version) {
    return next(null,version)
  }
  if (config.version) {
    return next(null,version)
  }
  // 
  // else try to get version from agent path using git
  //
  var cmd = 'cd ' + process.cwd() + ' && git describe'
  exec(cmd,{},function(error,stdout,stderr){
    version = (error||stderr) ? 'unknown' : stdout.trim()
    next(null,version)
  })
}
