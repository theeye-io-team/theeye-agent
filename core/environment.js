require('dotenv').config()

const fs = require('fs')
const path = require('path')
const logger = require('./lib/logger').create('eye::environment')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const VERSION_CONSTANT = require('./constants/version').VERSION

require('./lib/extend-error')

module.exports = async (config) => {
  if (!process.env.NODE_ENV) {
    logger.error('NODE_ENV not set')
    process.exit()
  }

  configureScriptsPath(config)
  configureWorkersLogsPath(config)

  try {
    version = await detectAgentVersion(config)
    process.env.THEEYE_AGENT_VERSION = version
    logger.log('agent version is %s', process.env.THEEYE_AGENT_VERSION)
  } catch (err) {
    logger.error('version cannot be detected')
  }
}

const configureScriptsPath = (config) => {
  let scriptsPath = (
    process.env.THEEYE_AGENT_SCRIPT_PATH ||
    config.scripts?.path
  )

  if (!scriptsPath) {
    scriptsPath = path.join(process.cwd(), 'downloads')
  }

  config.scripts.path = scriptsPath
  logger.log('scripts path is %s', config.scripts.path)

  if (!fs.existsSync(scriptsPath)) {
    fs.mkdirSync(scriptsPath, '0755')
  }
  return scriptsPath
}

const configureWorkersLogsPath = (config) => {
  const logs = (config.workers?.logs || {})

  if (!logs.path) {
    logs.path = path.join(process.cwd(), 'logs')
  }

  logger.log('Jobs execution logs path is %s', logs.path)

  if (!fs.existsSync(logs.path)) {
    logger.log('logs directory created')
    fs.mkdirSync(logs.path, '0755')
  }

  config.workers.logs = logs
  return logs
}

const detectAgentVersion = async (config) => {
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
