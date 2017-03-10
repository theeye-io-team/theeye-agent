'use strict';

var debug = require('debug');

var logger = {
  log: debug('eye:agent:worker'),
  error: debug('eye:agent:worker:error')
}

var Workers = {
  dstat: require('./dstat'),
  listener: require('./listener'),
  process: require('./process'),
  psaux: require('./psaux'),
  scraper: require('./scraper'),
  script: require('./script'),
  file: require('./file')
};

module.exports = {
  /**
   * Create and return an instance of worker
   * @param Object config
   * @param Connection connection
   * @return Worker instance
   */
  spawn: function (config,connection) {
    if (config.disabled===true) {
      logger.log('worker disabled');
      return null;
    }

    if (!config.type) {
      logger.error('worker configuration has missing property "type".');
      return null;
    }

    logger.log('creating worker %s', config.type);

    try {
      var worker = new Workers[config.type](connection, config);
    } catch (e) {
      logger.error('EWORKER: unable to spawn worker');
      logger.error(e);
      return null;
    }

    return worker;
  }
};
