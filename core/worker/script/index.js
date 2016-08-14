"use strict";

const FAILURE_STATE = 'failure';
const NORMAL_STATE = 'normal';

var Worker = require('../index').define('script');
var Script = require(APP_ROOT + '/lib/script');

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
  this.checkScript(this.script, error => {
    // if(error) return done(error);
    this.script.run().end(result=>{
    this.debug.log('result is %j',result);
      var lastline = result.lastline;
      var data = { 'data':result };

      var isEvent = isEventObject(lastline);
      if( isEvent ) {
        data.state = lastline.event;
        data.event = lastline;
      } else {
        data.state = lastline;
      }

      return next(null,data);
    });
  });
}

function isEventObject(input){
  return (input instanceof Object) && input.event ;
}
