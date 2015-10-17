var exec = require('child_process').exec;

var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = module.exports = require('../index').define('script');

Worker.prototype.initialize = function() {
  var worker = this;
  this.script = null;
  var config = this.config;
  this.debug.log("retrieving script");

  // this could take some time to fetch and setup , but then getData should validate it.
  // what if this process fails? buuh...hrrr
  this.getScriptPath(
    config.script_id, 
    config.script_md5, 
    function(scriptPath){
      worker.scriptPath = scriptPath;
    });
}

function getStateLine(str) {
  var fromIndex ;

  if( str[ str.length - 1 ] === "\n" ){
    fromIndex = str.length - 2; // ignore last end of line
  } else {
    fromIndex = str.length - 1;
  }

  var idx = str.lastIndexOf("\n", fromIndex);

  var lastline ;
  if(idx === -1) { // its one line string
    lastline = str.trim(); // remove spaces and return chars
  } else {
    lastline = str.substring(idx).trim();
  }
  return lastline.replace(/(\n|\r)+$/, '').trim();
}

Worker.prototype.getData = function(next) {
  var worker = this;
  var scriptPath = worker.scriptPath;
  if(!scriptPath) {
    this.debug.error('script is not ready');
  } else {
    var scriptArguments = worker.config.script_arguments || [];
    this.runScript(scriptPath, scriptArguments, function(err, output){
      var parsed;
      var str = output.stdout;
      var lastline = getStateLine(str);

      try {
        parsed = JSON.parse(lastline);
      } catch (e) {
        worker.debug.log('unhable to parse output as JSON');
        parsed = lastline;
      }

      if( typeof parsed != 'object' || ! parsed.state ) {
        worker.debug.log('no result object from script returned');
        worker.debug.log('submiting script text result');
        var result = {
          state: parsed,
          data: output
        }
      } else {
        worker.debug.log(parsed);
        var result = {
          state: parsed.state,
          data: output
        }
      }

      return next(null,result);
    });
  }
}
