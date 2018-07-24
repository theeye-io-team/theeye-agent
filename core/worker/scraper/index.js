'use strict';

var request = require('request');
var url = require('url');
var format = require('util').format;
var AbstractWorker = require('../abstract');
var Constants = require('../../constants');
var agentConfig = require('config')

const EventConstants = require('../../constants/events')

function setupRequestObject (config) {
  let defaultConfig = agentConfig.workers.scraper
  let version = process.env.THEEYE_AGENT_VERSION
  let wrapper = request.defaults({
    proxy: config.proxy || defaultConfig.proxy,
    tunnel: config.tunnel || defaultConfig.tunnel,
    timeout: parseInt(config.timeout || defaultConfig.timeout),
    json: config.json || defaultConfig.json,
    gzip: config.gzip || defaultConfig.gzip,
    url: config.url,
    method: config.method,
    body: (config.json===true) ? JSON.parse(config.body) : config.body,
    headers: {
      'User-Agent': 'TheEyeAgent/' + version.trim()
    }
  })

  return wrapper
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

    this.debug.log('creating request object %o', this.config)

    // on each cicle use the same pre-configured request object
    this.request = setupRequestObject(this.config)
  },
  getData: function(next) {
    var self = this;
    var config = this.config;

    function submit (result) {
      self.debug.log('scraper job result %o', result)
      let body
      let data

      if (result) {
        data = result.data
        if (data.response) { body = data.response.body }

        const submitBody = () => {
          // this is to force via code
          if (Constants.WORKERS_SCRAPER_REGISTER_BODY === false) {
            self.debug.log('cannot submit body. disabled by code (build required)')
            return false
          }

          let check = (
            agentConfig.workers.scraper.register_body === true ||
            config.register_body === true ||
            process.env.THEEYE_AGENT_SCRAPER_REGISTER_BODY === 'true'
          )

          if (check === true) {
            let contentHeader = data.response.headers['content-type']
            if (
              /application.json/.test(contentHeader) === true ||
              agentConfig.worker.scraper.only_json_response !== true
            ) {
              return true
            }
          }
          return false
        }

        const filterBody = () => {
          let bodyTooLong = (
            body.length > Constants.WORKERS_SCRAPER_REGISTER_BODY_SIZE
          )

          if (bodyTooLong) {
            self.debug.log(
              'response body is too long. body size will be truncated to %s kb long',
              Constants.WORKERS_SCRAPER_REGISTER_BODY_SIZE
            )

            result.data.response.body = [
              body.substring(0, Constants.WORKERS_SCRAPER_REGISTER_BODY_SIZE),
              '...(chunked)'
            ].join('')

            result.data.response.chunked = true
            result.data.response.message = 'respose body truncated. too long'
          }
        }

        if (body) {
          if (submitBody() !== true) {
            // empty it
            result.data.response.body = ''
          } else {
            self.debug.log('can submitting body')
            filterBody()
          }
        }

        return next(null,result)
      } else {
        var err = {
          state: Constants.ERROR_STATE,
          event: EventConstants.SCRAPER_ERROR,
          data: {
            message: 'unknown error'
          }
        };

        self.debug.log('monitor error: ', err)
        return next(null,err);
      }
    }

    // request does not require any options here, it was already configured
    this.request({}, function (error, response, body) {
      if (error) {
        self.debug.error('request failed')
        self.debug.error('%o',error)
        return submit({
          state: Constants.FAILURE_STATE ,
          event: EventConstants.SCRAPER_ERROR_REQ,
          data: {
            message: error.name + '. ' + error.message,
            expected: config.status_code,
            response: {
              status_code: response && response.statusCode,
              body: body,
              headers: response && response.headers,
              error: error.reason
            }
          }
        })
      }

      if (config.status_code) {
        try {
          var statusCodeRegexp = new RegExp(config.status_code);
        } catch (e) {
          return submit({
            state: Constants.ERROR_STATE,
            event: EventConstants.SCRAPER_ERROR_CONFIG_STATUS_CODE_INVALID_REGEX,
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
            event: EventConstants.SCRAPER_MISMATCH_STATUS_CODE,
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
            event: EventConstants.SCRAPER_ERROR_CONFIG_PATTERN_INVALID_REGEX,
            data:{
              message: 'pattern invalid: ' + e.message,
              error: {
                message: e.message,
                stack: e.stack,
                name: e.name
              }
            }
          })
        }

        self.debug.log('testing pattern %s against %s',config.pattern, body);
        if (new RegExp(config.pattern).test(body) === true){
          return submit({
            state: Constants.SUCCESS_STATE,
            event: EventConstants.SUCCESS,
            data: { 
              message:'request success', 
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
            event: EventConstants.SCRAPER_MISMATCH_PATTERN,
            data: {
              message: 'pattern does not match',
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
          event: EventConstants.SUCCESS,
          data: { 
            message:'request success', 
            response: {
              status_code: response.statusCode,
              body: body,
              headers: response.headers
            }
          } 
        })
      }
    })
  }
})
