require('dotenv').config()

const fs = require('fs')
const config = require('config')
const debug = require('debug')('eye::environment')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const VERSION = require('./constants/version').VERSION

require('./lib/extend-error')

module.exports = async () => {
  if (!process.env.NODE_ENV) {
    debug('NODE_ENV not set')
    process.exit()
  }

  createScriptsPath()
  createLogsPath()

  //const version = await detectAgentVersion()
  const version = VERSION
  if (version) {
    process.env.THEEYE_AGENT_VERSION = version
  }
  debug('agent version is %s', process.env.THEEYE_AGENT_VERSION)
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

//async function detectAgentVersion () {
//  const version = process.env.THEEYE_AGENT_VERSION
//  if (version) {
//    debug('using environment variable')
//    return version
//  }
//  if (config.version) {
//    debug('using configuration file')
//    return config.version
//  }
//  // 
//  // else try to get version from agent path using git
//  //
//  debug('using git describe')
//  const cmd = 'cd ' + process.cwd() + ' && git describe'
//  const { stdout, stderr } = await exec(cmd, {})
//  return (stderr ? 'unknown' : stdout.trim())
//}
