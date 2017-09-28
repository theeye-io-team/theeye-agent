'use strict';
var exec = require('child_process').exec;
module.exports = function(doneFn) {
  var version = process.env.THEEYE_AGENT_VERSION;
  if (version) {
    return doneFn(null,version);
  }

  // 
  // else try to get version from agent path
  //
  var cmd = 'cd ' + process.cwd() + ' && git describe';
  exec(cmd,{},function(error,stdout,stderr){
    version = (error||stderr) ? 'cannot determine version' : stdout.trim();
    process.env.THEEYE_AGENT_VERSION = version;
    doneFn(null,version);
  });
}
