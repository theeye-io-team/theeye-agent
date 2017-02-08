'use strict';

var ps = require('theeye-ps-node');
var AbstractWorker = require('../abstract');
var Constants = require('../../constants');

/**
 * verify process status and informe server with statics data
 */
module.exports = AbstractWorker.extend({
  type: 'process',
  getId: function(next) {
    return this.config.resource_id ;
  },
  getData: function(next) {
    var self = this;

    ps.lookup({
      command: this.config.ps.pattern,
      psargs: 'axo pid,ppid,user,command'
    }, function (error, pslist) {
      var payload = {
        event: '',
        state: '',
        data: { ps: pslist }
      };

      if (error) {

        payload.state = Constants.FAILURE_STATE;
        payload.event = Constants.WORKERS_ERROR_EVENT;
        payload.data = {
          ps: pslist,
          error: {
            message: error.message,
            code: error.code,
            error: error,
          }
        };
        return next(error);

      } else if (pslist.length == 0) { // process is not running

        self.debug.log("process '%s' check failed. new state '%s' !!", self.config.name, Constants.FAILURE_STATE);
        payload.state = Constants.FAILURE_STATE;
        return next(null,payload);

      } else {

        self.debug.log("success");
        payload.state = Constants.SUCCESS_STATE;
        return next(null,payload);

      }
    });
  }
});
