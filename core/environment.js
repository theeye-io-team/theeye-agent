'use strict';

var fs = require('fs');
var config = require('config');
var debug = require('debug')('eye::environment');
var detectVersion = require('./lib/version');

module.exports = function (next) {
  var env = process.env.NODE_ENV ;
  var scriptsPath = process.env.THEEYE_AGENT_SCRIPT_PATH ;

  if (!scriptsPath) {
    scriptsPath = process.cwd() + '/../scripts' ;
  }

  detectVersion(function(error,version){

    if (!process.env.THEEYE_AGENT_VERSION) {
      if (config.version) {
        process.env.THEEYE_AGENT_VERSION = config.version;
      }
      // else leave it empty
    }
    debug('agent version is %s', process.env.THEEYE_AGENT_VERSION);

    process.env.THEEYE_AGENT_SCRIPT_PATH = scriptsPath;
    debug('scripts path is %s',scriptsPath);

    fs.exists(scriptsPath, function(exists){
      if (!exists) {
        fs.mkdirSync(scriptsPath,'0755');
      }
      next(scriptsPath);
    });

  });
}
