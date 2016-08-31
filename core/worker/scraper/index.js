var request = require('request');
var url = require('url');
var format = require('util').format;

var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = require('../index').define('scraper');

function setupRequestObject(config){
  request.defaults({
    proxy: process.env.http_proxy,
    tunnel: false,
    timeout: parseInt(config.timeout),
    json: config.json||false,
    gzip: config.gzip||false,
    headers: {
      'User-Agent':'TheEyeAgent/' + process.env.THEEYE_AGENT_VERSION
    }
  });
  return request;
}

function validateRequestURI(uri){
  var parsedUri = url.parse(uri);
  if( !(parsedUri.host || (parsedUri.hostname && parsedUri.port)) ){
    var error = new Error( format('invalid worker configuration. invalid uri "%s"', options.url) );
    error.code = 'E_INVALID_URL';
    throw error;
  }
  return ;
}

Worker.prototype.initialize = function() {
  var timeout = parseInt(this.config.request_options.timeout);
  this.config.request_options.timeout = timeout;

  validateRequestURI(this.config.request_options.url);

  this.request = setupRequestObject(this.config.request_options);
}

Worker.prototype.getData = function(next)
{
  var self = this;
  var request_options = this.config.request_options;
  var response_options = this.config.response_options;

  function end(failure, success){
    if( success ){
      self.debug.log("service normal");
      return next(null,success);
    } else {
      if(!failure){
        failure = {
          state: FAILURE_STATE,
          event: 'ERROR',
          data: {
            message: 'unknown error', event:'ERROR'
          }
        };
      }

      self.debug.log("service failure");
      return next(null,failure);
    }
  }

  this.request(request_options, function(error, response, body){
    if( error ) {
      self.debug.error(errstr);
      return end({
        state: FAILURE_STATE ,
        event: 'scraper.request.error',
        data: {
          message: error.name + '. ' + error.message,
          result: response.statusCode,
          expected: response_options.status_code,
          body: body
        }
      });
    }

    if( response_options.status_code ){
      try {
        var statusCodeRegexp = new RegExp(response_options.status_code);
      } catch (e) {
        var eventName = 'scraper.status_code.invalid_regexp';
        return end({
          state: eventName,
          event: eventName,
          data: {
            message: 'status code regexp ' + response_options.status_code + ' is not valid regular expression',
            error: {
              message: e.message,
              stack: e.stack,
              name: e.name
            }
          }
        });
      }

      if( statusCodeRegexp.test( response.statusCode ) === false  ){
        return end({
          state: FAILURE_STATE,
          event: 'scraper.status_code.not_match',
          data: {
            message: 'status code ' + response.statusCode + ' expected to match ' + response_options.status_code,
            expected: response_options.status_code,
            response:{
              status_code: response.statusCode,
              body: body
            }
          }
        });
      }
    }

    if( response_options.parser == 'pattern' ){
      self.debug.log('searching pattern %s',response_options.pattern);
      try{
        var pattern = new RegExp(response_options.pattern);
      } catch(e) {
        var eventName = 'scraper.pattern.invalid_regexp';
        end({
          state: eventName,
          event: eventName,
          data:{
            message:'pattern invalid: ' + e.message,
            error: {
              message: e.message,
              stack: e.stack,
              name: e.name
            },
            event: 'ERROR'
          }
        });
      }

      if( pattern.test( body ) === true ){
        end(null,{ state: NORMAL_STATE, event: 'scraper.pattern.match', });
      } else {
        end({ state: FAILURE_STATE, event: 'scraper.pattern.not_match', });
      }
    } else {
      end(null,{state: NORMAL_STATE, data:{message:'request success', event: 'ok'}});
    }
  });
}

module.exports = Worker;
