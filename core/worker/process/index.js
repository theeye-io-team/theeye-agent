'use strict';

var ps = require('theeye-ps-node');
var AbstractWorker = require('../abstract');

/**
 * verify process status and informe server with statics data
 */
var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = module.exports = AbstractWorker.extend({
  type:'process',
  getId : function(next) {
    return this.config.resource_id ;
  },
  getData : function(next) {
    var self = this;

    ps.lookup({
      command: this.config.ps.pattern,
      psargs: 'axo pid,ppid,user,command'
    },function(error, pslist){
      var event = { state: '', data: pslist };

      if(error) {
        event.state = FAILURE_STATE;
        return next(error);
      }
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
  }
});
