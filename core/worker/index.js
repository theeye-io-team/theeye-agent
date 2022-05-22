
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
  ping: require('./ping')
}

/**
 * Create and return an instance of worker
 * @param Object config
 * @param Connection connection
 * @return Worker instance
 */
module.exports.spawn = function (app, config,connection) {
  if (config.disabled===true) {
    logger.log('worker disabled');
    return null;
  }

  if (!config.type) {
    logger.error('worker configuration has missing property "type".');
    return null;
  }

  logger.log('creating worker %s', config.type);

  let worker
  try {
    worker = new Workers[config.type](app, connection, config)
  } catch (e) {
    logger.error('EWORKER: unable to spawn worker');
    logger.error(e);
    return null;
  }

  return worker;
}
