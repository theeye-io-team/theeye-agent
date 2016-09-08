var request = require('request');
var url = require('url');
var format = require('util').format;

var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

var Worker = require('../index').define('scraper');

function setupRequestObject(config){
  var wrapper = request.defaults({
    proxy: process.env.http_proxy,
    tunnel: false,
    timeout: parseInt(config.timeout),
    json: config.json||false,
    gzip: config.gzip||false,
    url: config.url,
    method: config.method,
    body: config.body,
    headers: {
      'User-Agent':'TheEyeAgent/' + process.env.THEEYE_AGENT_VERSION
    }
  });
  return wrapper;
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
  var timeout = parseInt(this.config.timeout);
  this.config.timeout = timeout;

  validateRequestURI(this.config.url);

  // on each cicle use the same pre-configured request object
  this.request = setupRequestObject(this.config);
}

Worker.prototype.getData = function(next)
{
  var self = this;
  var config = this.config;

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

      self.debug.log("service failure", failure);
      return next(null,failure);
    }
  }

  // request no require options here, it is already configured
  this.request({},function(error, response, body){
    if( error ) {
      self.debug.error(error);
      return end({
        state: FAILURE_STATE ,
        //event: 'scraper.request.error',
        data: {
          message: error.name + '. ' + error.message,
          result: response.statusCode,
          expected: config.status_code,
          body: body
        }
      });
    }

    if( config.status_code ){
      try {
        var statusCodeRegexp = new RegExp(config.status_code);
      } catch (e) {
        var eventName = 'scraper.status_code.invalid_regexp';
        return end({
          state: eventName,
          event: eventName,
          data: {
            message: 'status code regexp ' + config.status_code + ' is not valid regular expression',
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
            message: 'status code ' + response.statusCode + ' expected to match ' + config.status_code,
            expected: config.status_code,
            response:{
              status_code: response.statusCode,
              body: body
            }
          }
        });
      }
    }

    if( config.parser == 'pattern' ){
      try{
        var pattern = new RegExp(config.pattern);
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

      self.debug.log('testing pattern %s against %s',config.pattern, body);
      if( pattern.test( body ) === true ){
        end(null,{ state: NORMAL_STATE });
      } else {
        end({ state: FAILURE_STATE, data:{message:'pattern does not match', code: 'scraper.pattern.not_match'} });
      }
    } else {
      end(null,{state: NORMAL_STATE, data:{message:'request success', event: 'ok'}});
    }
  });
}

module.exports = Worker;
