
const path = require('path')
const util = require('util')
const Debug = require('debug')
const fs = require('fs')
const dump = Debug('theeye:lib:logger')

// @TODO if we need more than this we cat give a chance to
// https://www.npmjs.com/package/winston

const Logger = {}

Logger.configure = (settings) => {
  return new Promise((resolve, reject) => {
    if (!settings?.file) {
      dump('file not configured')
      return resolve()
    }

    if (settings.file.enabled === false) {
      dump('file logger disabled')
      return resolve()
    }

    const dirname = settings.file.dirname || process.cwd()
    const basename = settings.file.basename || 'theeye-agent.log'

    const levels = settings.file.levels || ['error']
    Logger.levels = levels

    const filename = path.join(dirname, basename)

    const stream = fs.createWriteStream(filename,{flags: 'a'})
      .on('error', err => dump(err))
      .on('close', () => dump('close'))
      .on('open', () => {
        dump(`file ${filename} open ok`)
        Logger.file = stream
        resolve()
      })
  })
}

Logger.writeFile = (namespace, message) => {
  if (!Logger.file) { return }
  const time = new Date().toISOString()
  const json = JSON.stringify({ time, namespace, message }) + '\n'

  Logger.file.write(json)
}

Logger.levelTemplate = `%TIMESTAMP%:%MODULE%:%LEVEL%:%NAME%`

Logger.create = (name) => {
  const logger = { }
  logger.log = createLoggerLevel(name, 'log')
  logger.error = createLoggerLevel(name, 'error')
  logger.warn = createLoggerLevel(name, 'warn')
  logger.data = createLoggerLevel(name, 'data')
  logger.debug = createLoggerLevel(name, 'debug')
  return logger
}

const createLoggerLevel = (name, level) => {
  const namespace = Logger.levelTemplate
    .replace('%TIMESTAMP%', new Date().toISOString())
    .replace('%MODULE%', 'theeye')
    .replace('%LEVEL%', level)
    .replace('%NAME%', name)

  const debug = Debug(namespace)

  if (Logger.file &&
    (Logger.levels === '*' || Logger.levels.indexOf(level) !== -1)
  ) {
    return (...args) => {
      debug(...args)
      const formattedMessage = util.format(...args)
      Logger.writeFile(namespace, formattedMessage)
    }
  } else {
    return (...args) => {
      debug(...args)
    }
  }
}

module.exports = Logger
