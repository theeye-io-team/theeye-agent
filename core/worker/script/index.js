"use strict";

var Worker = require('../index').define('script');
var Script = require(APP_ROOT + '/lib/script');

var FAILURE_STATE = 'failure';
var SUCCESS_STATE = 'normal';

module.exports = Worker;

Worker.prototype.initialize = function(){
  var path = process.env.THEEYE_AGENT_SCRIPT_PATH;
  var config = this.config.script;
  this.script = new Script({
    id: config.id,
    args: config.arguments,
    runas: config.runas,
    filename: config.filename,
    md5: config.md5,
    path: path,
  });
}

Worker.prototype.getData = function(next) {
  var self = this;
  this.checkScript(this.script,function(error){
    // if(error) return done(error);
    self.script.run(function(result){
      self.debug.log('result is %j',result);
      var lastline = result.lastline;
      var data = { 'data': result };
      data.state = lastline;
      return next(null,data);
    });
  });
}
