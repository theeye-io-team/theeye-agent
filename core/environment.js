var fs = require('fs');

function setenv(next)
{
  var env = process.env.NODE_ENV ;

  process.env['BASE_PATH'] = __dirname ;
  process.env['NODE_PATH'] = __dirname ;

  var config = require('config').get('core');

  if(!process.env.THEEYE_AGENT_SCRIPT_PATH)
    throw new Error('ERROR. env variable THEEYE_AGENT_SCRIPT_PATH undefined');

  var scriptsPath = process.env.THEEYE_AGENT_SCRIPT_PATH ;
  if( ! scriptsPath ) scriptsPath = '/tmp/theeye/' ;

  fs.exists(scriptsPath, function(exists){
    if( ! exists ) {
      fs.mkdirSync(scriptsPath, 0755);
    }
    next();
  });
}

exports.setenv = setenv ;
