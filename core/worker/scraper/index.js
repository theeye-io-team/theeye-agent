'use strict';

var request = require('request');
var url = require('url');
var format = require('util').format;
var AbstractWorker = require('../abstract');
var Constants = require('../../constants');

function setupRequestObject (config) {
  var version = process.env.THEEYE_AGENT_VERSION;
  var wrapper = request.defaults({
    proxy: process.env.http_proxy,
    tunnel: false,
    timeout: parseInt(config.timeout),
    //json: config.json||false,
    json: false,
    gzip: config.gzip||false,
    url: config.url,
    method: config.method,
    body: config.body,
    headers: {
      'User-Agent':'TheEyeAgent/' + version.trim()
    }
  });
  return wrapper;
}

function validateRequestURI (uri) {
  var parsedUri = url.parse(uri);
  if( !(parsedUri.host || (parsedUri.hostname && parsedUri.port)) ){
    var error = new Error( format('invalid worker configuration. invalid uri "%s"', options.url) );
    error.code = 'E_INVALID_URL';
    throw error;
  }
  return;
}

module.exports = AbstractWorker.extend({
  type: 'scraper',
  initialize: function() {
    var timeout = parseInt(this.config.timeout);
    this.config.timeout = timeout;

    validateRequestURI(this.config.url);

    // on each cicle use the same pre-configured request object
    this.request = setupRequestObject(this.config);
  },
  getData: function(next) {
    var self = this;
    var config = this.config;

    function submit (result) {
      var body;
      var data;
      if (result) {
        data = result.data;
        if (data.response) {
          if (body = data.response.body) {
            if (body.length > Constants.PAYLOAD_BODY_SIZE) {
              result.data.response.body = body.substring(0,Constants.PAYLOAD_DATA_SIZE) + '...(chunked)';
              result.data.response.chunked = true;
              result.data.response.message = 'respose body too large.';
            }
          }
        }
        return next(null,result);
      } else {
        var err = {
          state: Constants.ERROR_STATE,
          event: 'scraper.error',
          data: {
            message: 'unknown error',
            event: 'error'
          }
        };

        self.debug.log('monitor error: ', err);
        return next(null,err);
      }
    }

    // request no require options here, it is already configured
    this.request({},function(error, response, body){
      if (error) {
        self.debug.error(error);
        return submit({
          state: Constants.FAILURE_STATE ,
          event: 'scraper.request.error',
          data: {
            message: error.name + '. ' + error.message,
            expected: config.status_code,
            response: {
              status_code: response.statusCode,
              body: body,
              headers: response.headers
            }
          }
        });
      }

      if( config.status_code ){
        try {
          var statusCodeRegexp = new RegExp(config.status_code);
        } catch (e) {
          return submit({
            state: Constants.ERROR_STATE,
            event: 'scraper.config.status_code.invalid_regexp',
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

        if (statusCodeRegexp.test(response.statusCode) === false) {
          return submit({
            state: Constants.FAILURE_STATE,
            event: 'scraper.status_code.not_match',
            data: {
              message: 'status code ' + response.statusCode + ' expected to match ' + config.status_code,
              expected: config.status_code,
              response: {
                status_code: response.statusCode,
                body: body,
                headers: response.headers
              }
            }
          });
        }
      }

      if( config.parser == 'pattern' ){
        try{
          var pattern = new RegExp(config.pattern);
        } catch(e) {
          return submit({
            state: Constants.ERROR_STATE,
            event: 'scraper.config.pattern.invalid_regexp',
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
        if (new RegExp(config.pattern).test(body) === true){
          return submit({
            state: Constants.SUCCESS_STATE,
            event: 'success',
            data: { 
              message:'request success', 
              event:'success', 
              response: {
                status_code: response.statusCode,
                body: body,
                headers: response.headers
              }
            } 
          });
        } else {
          return submit({
            state: Constants.FAILURE_STATE,
            event: 'scraper.pattern.not_match',
            data: {
              message:'pattern does not match',
              code: 'scraper.pattern.not_match',
              response: {
                status_code: response.statusCode,
                body: body,
                headers: response.headers
              }
            }
          });
        }
      } else {
        return submit({
          state: Constants.SUCCESS_STATE,
          event: 'success', 
          data: { 
            message:'request success', 
            response: {
              status_code: response.statusCode,
              body: body,
              headers: response.headers
            }
          } 
        });
      }
    });
  }
});
