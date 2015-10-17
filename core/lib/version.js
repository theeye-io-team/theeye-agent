
var exec = require('child_process').exec;

module.exports = function(doneFn) {

  var version = process.env.THEEYE_AGENT_VERSION;
  if( version ) return doneFn(null, version);

  // 
  // else try to get version from agent path
  //
  var cmd = 'cd ' + process.cwd() + ' && git describe';
  var opts = {};

  exec(cmd, opts, function(error, stdout, stderr){
    if(error || stderr) return doneFn(error);

    doneFn(null, stdout);
  });

}
