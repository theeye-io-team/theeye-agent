var util = require('util');
var AbstractWorker = require('./abstract');

var debug = {
  log   : require('debug')('eye:agent:worker'),
  error : require('debug')('eye:agent:worker:error')
}

module.exports = {
  /**
   * Create an instance of a worker and put to run
   * @param Object config
   * @param Connection connection
   * @return Worker instance
   */
  spawn : function(config, connection)
  {
    if( ! config.disabled )
    {
      if( typeof config.type == 'undefined' )
      {
        debug.error('worker configuration has missing property "type"');
        debug.error(config);
        process.exit(-1);
      }

      var Class = require( process.env.BASE_PATH + '/worker/' + config.type );

      debug.log('creating %s worker ', config.type);
      var instance = new Class(connection, config);
      // put it to work
      instance.run();

      return instance ;
    } else {
      debug.log('worker disabled');
      return null;
    }
  },
  /**
   * Define a custom worker structure
   * @param String type
   * @return Worker definition
   */
  define : function(type){
    var Worker = function (cnx,cfg) {
      if(cfg.name){
        var log = util.format( 'eye:agent:worker:%s:%s', type, cfg.name);
      }else{
        var log = 'eye:agent:worker:' + type;
      }
      this.debug = {
        log : require('debug')(log),
        error : require('debug')(log + ':error'),
      }
      this.debug.log('creating worker %s',type);

      AbstractWorker.apply(this,arguments);
    }

    util.inherits(Worker, AbstractWorker);
    return Worker;
  }
};
