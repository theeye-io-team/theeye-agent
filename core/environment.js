'use strict'

var fs = require('fs')
var config = require('config')
var debug = require('debug')('eye::environment')
var exec = require('child_process').exec
require('./lib/extend-error')

module.exports = function (next) {
  var env = process.env.NODE_ENV

  if (!env) {
    debug('no env set')
    process.exit()
  }

  createScriptsPath(function(error){
    detectAgentVersion(function(error,version){
      process.env.THEEYE_AGENT_VERSION = version
      debug('agent version is %s', process.env.THEEYE_AGENT_VERSION)
      next()
    })
  })
}

function createScriptsPath (next) {
  var scriptsPath = process.env.THEEYE_AGENT_SCRIPT_PATH || config.scripts.path
  if (!scriptsPath) {
    scriptsPath = process.cwd() + '/../downloads'
  }

  //process.env.THEEYE_AGENT_SCRIPT_PATH = scriptsPath

  config.scripts.path = scriptsPath

  debug('scripts path is %s', config.scripts.path)

  fs.exists(scriptsPath, function (exists) {
    if (!exists) {
      fs.mkdirSync(scriptsPath, '0755')
    }
    next(null, scriptsPath)
  })
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
