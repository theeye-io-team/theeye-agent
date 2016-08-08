var ps = require('iar-ps');

/**
 * verify process status and informe server with statics data
 */
//Extended for supporting windows using git-bash
var os = require('os');
var psArgs='aux';
if ( "win32" === os.platform())
 psArgs='W';
 

var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = require('../index').define('process');

Worker.prototype.getId = function(next) {
  return this.config.resource_id ;
};

Worker.prototype.getData = function(next) {
  var self = this;

  self.debug.log('process config %j', self.config);

  ps.lookup({
    command: self.config.ps.pattern,
    psargs: psArgs
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
      event.state = NORMAL_STATE;
      return next(null,event);
    }
  });
};

module.exports = Worker;
