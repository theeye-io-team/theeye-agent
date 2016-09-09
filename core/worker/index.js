"use strict";

var util = require('util');
var AbstractWorker = require('./abstract');
var debug = require('debug');

var logger = {
  'log': debug('eye:agent:worker'),
  'error': debug('eye:agent:worker:error')
}

module.exports = {
  /**
   * Create and return an instance of worker
   * @param Object config
   * @param Connection connection
   * @return Worker instance
   */
  spawn: function(config, connection) {
    if( config.disabled ) {
      logger.log('worker disabled');
      return null;
    }

    if( ! config.type ) {
      logger.error('worker configuration has missing property "type".');
      return null;
    }

    var cname = [ APP_ROOT, 'worker', config.type ].join('/');
    var Class = require(cname);

    logger.log('creating worker %s',config.type);
    return new Class(connection, config);
  },
  /**
   * Define a custom worker structure
   * @param String type
   * @return Worker definition
   */
  define : function(type){
    function Worker (connection,config) {
      var name = config.name;
      var part = type + (name?':'+name:'');
      var log = 'eye:agent:worker:' + part
      this.debug = {
        'log': debug(log),
        'error': debug(log + ':error')
      }
      AbstractWorker.apply(this,arguments);
    }
    util.inherits(Worker, AbstractWorker);
    return Worker;
  }
};
