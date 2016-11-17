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

function detectEvent (data) {
  if (data.killed) return 'killed';
  return undefined;
}

function isObject (value) {
  return Object.prototype.toString.call(value) == '[object Object]';
}

Worker.prototype.getData = function(next) {
  var self = this;

  this.checkScript(this.script,function(error){
    // if(error) return done(error);
    self.script.run(function(result){
      var json, state, payload, lastline = result.lastline;

      try {
        // try to convert JSON
        json = JSON.parse(lastline);
      } catch (e) {
        // it is not JSON
        self.debug.error('cannot convert output to valid JSON');
        self.debug.error(e);
        json = null;
      }

      if (json) {
        state = isObject(json) ? json.state : json; // if object ? object.state : object as is .
      } else {
        state = lastline; // ok , just asume the last line is the result state
      }

      payload = {
        script_result: result,
        state: state,
        event: detectEvent(result)||state,
        // data is available only when the script returns it
        data: json?(json.data||json):undefined
      };

      self.debug.log('execution result is %j', payload);
      return next(null,payload);
    });
  });
}
