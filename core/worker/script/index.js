"use strict";

const FAILURE_STATE = 'failure';
const NORMAL_STATE = 'normal';

var Worker = require('../index').define('script');
var Script = require(APP_ROOT + '/lib/script');

module.exports = Worker;

Worker.prototype.initialize = function(){
  var config = this.config;
  var path = process.env.THEEYE_AGENT_SCRIPT_PATH;
  this.script = new Script(config.script,{
    path: path
  });
}

Worker.prototype.getData = function(next) {
  this.checkScript(this.script, error => {
    // if(error) return done(error);
    this.script.run()
    .once('end',(result)=>{
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
