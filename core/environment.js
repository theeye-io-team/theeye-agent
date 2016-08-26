var fs = require('fs');

function setenv(next)
{
  var env = process.env.NODE_ENV ;

  process.env['BASE_PATH'] = __dirname ;
  process.env['NODE_PATH'] = __dirname ;

  var config = require('config').get('core');

  var scriptsPath = process.env.THEEYE_AGENT_SCRIPT_PATH ;
  if( ! scriptsPath ) scriptsPath = __dirname + '/scripts' ;

  process.env.THEEYE_AGENT_SCRIPT_PATH = scriptsPath;

  fs.exists(scriptsPath, function(exists){
    if( ! exists ) {
      fs.mkdirSync(scriptsPath, 0755);
    }
    next(scriptsPath);
  });
}

exports.setenv = setenv ;
