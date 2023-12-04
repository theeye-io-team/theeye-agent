
const logger = require('../lib/logger').create('worker')

const os = require('os')
const platform = os.platform()

if (/win/.test(platform)) { // win32 & win64
  logger.error('Windows dstat is unsopported in this version')
  dstat = {}
} else {
  dstat = require('./dstat')
}

const Workers = {
  dstat,
  listener: require('./listener'),
  process: require('./process'),
  psaux: require('./psaux'),
  scraper: require('./scraper'),
  script: require('./script'),
  file: require('./file'),
  ping: require('./ping'),
  nodejs: require('./nodejs'),
}

/**
 * Create and return an instance of worker
 * @param Object config
 * @param Connection connection
 * @return Worker instance
 */
module.exports.spawn = function (app, config,connection) {
  try {
    if (config.disabled===true) {
      throw new Error('worker disabled')
    }

    const type = (config.type || config._type).toLowerCase()
    const worker = new Workers[type](app, connection, config)
    return worker
  } catch (e) {
    logger.error('EWORKER: unable to spawn worker');
    logger.error(e);
    return null;
  }
}
