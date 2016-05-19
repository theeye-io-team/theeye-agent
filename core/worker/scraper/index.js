var request = require('request');
var Parser = require('./parser');
var url = require('url');
var format = require('util').format;

//var FAILURE_STATE = 'not_match';
//var NORMAL_STATE = 'match';
var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = require('../index').define('scraper');

Worker.prototype.getData = function(next)
{
  var self = this;
  var options = self.config.request_options ;

  var parsedUri = url.parse(options.url);
  if( !(parsedUri.host || (parsedUri.hostname && parsedUri.port)) ){
    var error = new Error( format('invalid worker configuration. invalid uri "%s"', options.url) );
    error.code = 'E_INVALID_URL';
    self.debug.error(error);
    return next(error, null);
  }

  var parser = new Parser({ pattern : self.config.pattern });

  options.timeout = Number(options.timeout) || 5000;

  request(options)
  .on('error',function(error){
    var errstr = error.name + '. ' + error.message ;
    self.debug.error(errstr);

    return next(null,{ 
      state: FAILURE_STATE , 
      data: errstr
    });
  })
  .pipe( parser )
  .on('error',function(error){
    var errstr = error.name + '. ' + error.message ;
    self.debug.error(errstr);

    return next(null,{ 
      state: FAILURE_STATE , 
      data: errstr
    });
  })
  .on('pattern_matched',function(){
    self.debug.log("service normal");
    return next(null,{ 
      state: NORMAL_STATE,
      data: "match ok"
    });
  });
};

module.exports = Worker;
