var ps = require('ps-node');

/**
 * verify process status and informe server with statics data
 */
var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = require('../index').define('process');

Worker.prototype.getId = function(next) {
  return this.config.resource_id ;
};

Worker.prototype.getData = function(next) {
  var self = this;

  ps.lookup({
    grep: self.config.ps.pattern,
    psargs: 'aux'
  },function(error, pslist){
    var event = { state: '', data: pslist };

    if(error) return next(error);
    else if( pslist.length == 0 ) // process is not running
    {
      self.debug.log("process '%s' check failed. new state '%s' !!", self.config.name, FAILURE_STATE);
      event.state = FAILURE_STATE;
      return next(null,event);
    }
    else
    {
      self.debug.log("success");
      event.state = NORMAL_STATE;
      return next(null,event);
    }
  });
};

module.exports = Worker;
