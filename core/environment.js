require('dotenv').config()

const fs = require('fs')
const path = require('path')
const logger = require('./lib/logger').create('eye::environment')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

require('./lib/extend-error')

module.exports = async (config) => {
  if (!process.env.NODE_ENV) {
    logger.error('NODE_ENV not set')
    process.exit()
  }

  configureScriptsPath(config)
  configureWorkersLogsPath(config)

  const version = await detectAgentVersion(config).catch(err => {
    logger.error(err)
    return 'version error'
  })
  process.env.THEEYE_AGENT_VERSION = version
  logger.log('agent version detected is %s', process.env.THEEYE_AGENT_VERSION)
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

async function detectAgentVersion (config) {
  let version = process.env.THEEYE_AGENT_VERSION
  if (version) {
    logger.log('environment version is %s', version)
    return version
  }

  version = config.version
  if (version) {
    logger.log('configured version is %s', version)
    return version
  }

  // 
  // else try to get version from agent path using git
  //
  const cmd = `cd ${process.cwd()} && git describe`
  const { error, stdout, stderr } = await exec(cmd, {}).catch(error => {
    logger.error(error)
    return {error}
  })
  version = (error||stderr ? 'version error' : stdout?.trim())

  logger.log('sources version is %s', version)
  return version
}
