require('dotenv').config()

const fs = require('fs')
const config = require('config')
const logger = require('./lib/logger').create('eye::environment')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const VERSION_CONSTANT = require('./constants/version').VERSION

require('./lib/extend-error')

module.exports = async () => {
  if (!process.env.NODE_ENV) {
    logger.error('NODE_ENV not set')
    process.exit()
  }

  createScriptsPath()
  createLogsPath()

  try {
    version = await detectAgentVersion()

    process.env.THEEYE_AGENT_VERSION = version
    logger.log('agent version is %s', process.env.THEEYE_AGENT_VERSION)
  } catch (err) {
    logger.error('version cannot be detected')
  }
}

function createScriptsPath () {
  var scriptsPath = (process.env.THEEYE_AGENT_SCRIPT_PATH || config.scripts && config.scripts.path)
  if (!scriptsPath) {
    scriptsPath = process.cwd() + '/../downloads'
  }

  config.scripts.path = scriptsPath
  logger.log('scripts path is %s', config.scripts.path)

  if (!fs.existsSync(scriptsPath)) {
    fs.mkdirSync(scriptsPath, '0755')
  }
  return scriptsPath
}

function createLogsPath () {
  let path = (process.env.THEEYE_AGENT_LOGS_PATH || config.logs && config.logs.path)
  if (!path) {
    debug('Logs path is not set')
    return
  }

  if (!config.logs) {
    config.logs = {}
  }

  config.logs.path = path 
  logger.log('Logs path is %s', config.logs.path)

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, '0755')
  }

  return path
}

async function detectAgentVersion () {
  let version = VERSION_CONSTANT
  if (version) {
    logger.log('compiled version is %s', version)
    return version
  }

  version = process.env.THEEYE_AGENT_VERSION
  if (version) {
    logger.log('environment version is %s', version)
    return version
  }

  if (config.version) {
    logger.log('configured version is %s', version)
    return config.version
  }
  // 
  // else try to get version from agent path using git
  //
  const cmd = 'cd ' + process.cwd() + ' && git describe'
  const { stdout, stderr } = await exec(cmd, {})
  version = (stderr ? 'unknown' : stdout.trim())

  logger.log('sources version is %s', version)
  return version
}
