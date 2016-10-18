"use strict";

var Worker = require('../index').define('script');
var Script = require(APP_ROOT + '/lib/script');

module.exports = Worker;

Worker.prototype.initialize = function(){
  var path = process.env.THEEYE_AGENT_SCRIPT_PATH;
  var config = this.config.script;
  this.script = new Script({
    id: config.id,
    args: config.arguments||[],
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
      var lastline = result.lastline;
      var objOutput;
      try {
        objOutput = JSON.parse(lastline);
      } catch (e) {
        objOutput = null;
      }

      var payload = { 'script_result': result };
      if( objOutput ){
        payload.state = objOutput.state || undefined;
        payload.data = objOutput.data || objOutput;
      } else {
        payload.state = lastline;
        payload.data = undefined;
      }

      self.debug.log('execution result is %j', payload);
      return next(null,payload);
    });
  });
}
