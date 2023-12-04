
const request = require('request');
const url = require('url');
const format = require('util').format;
const AbstractWorker = require('../abstract');
const Constants = require('../../constants');

const AgentConfig = require('config')
const ScraperConfig = (AgentConfig.workers?.scraper || {})

const EventConstants = require('../../constants/events')

function setupRequestObject (config) {
  let version = process.env.THEEYE_AGENT_VERSION || ''
  let headers = Object.assign({}, config.headers, {
    'User-Agent': 'TheEyeAgent/' + version.trim()
  })

  if (config.json === true) {
    headers['Content-Type'] = 'application/json'
  }

  let wrapper = request.defaults({
    strictSSL: config.strictSSL || ScraperConfig.strictSSL,
    proxy: config.proxy || ScraperConfig.proxy,
    tunnel: config.tunnel || ScraperConfig.tunnel,
    timeout: parseInt(config.timeout || ScraperConfig.timeout),
    gzip: config.gzip || ScraperConfig.gzip,
    url: config.url,
    method: config.method,
    json: false, // cannot change this. response should be always string
    body: config.body,
    headers
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
  initialize () {
    var timeout = parseInt(this.config.timeout);
    this.config.timeout = timeout;

    validateRequestURI(this.config.url);

    this.debug.log('creating request object %o', this.config)

    // on each cicle use the same pre-configured request object
    this.request = setupRequestObject(this.config)
  },
  getData (next) {
    var self = this
    var config = this.config

    function submit (payload) {
      self.debug.log('scraper job result payload %j', payload)
      let body
      let data

      if (payload) {
        data = payload.data
        if (data.response) { body = data.response.body }

        const submitBody = () => {
          // this is to force via code
          if (Constants.WORKERS_SCRAPER_REGISTER_BODY === false) {
            self.debug.log('cannot submit body. disabled by code (build required)')
            return false
          }

          const REGISTER_BODY = (
            ScraperConfig.register_body === true ||
            config.register_body === true ||
            process.env.THEEYE_AGENT_SCRAPER_REGISTER_BODY === 'true'
          )

          if (REGISTER_BODY === true) {
            const contentHeader = data.response.headers['content-type']
            if (
              /application.json/.test(contentHeader) === true ||
              ScraperConfig.only_json_response !== true
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

            payload.data.response.body = [
              body.substring(0, Constants.WORKERS_SCRAPER_REGISTER_BODY_SIZE),
              '...(chunked)'
            ].join('')

            payload.data.response.chunked = true
            payload.data.response.message = 'respose body truncated. too long'
          }
        }

        if (body) {
          if (submitBody() !== true) {
            // empty it
            payload.data.response.body = ''
          } else {
            filterBody()
          }
        }

        payload.data.output = payload.data.response.body

        return next(null, payload)
      } else {
        var err = {
          state: Constants.ERROR_STATE,
          event: EventConstants.SCRAPER_ERROR,
          data: {
            message: 'unknown error'
          }
        };

        self.debug.error('scraper error: ', err)
        return next(null, err);
      }
    }

    // request does not require any options here
    // it was already configured
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

      if (config.parser == 'pattern') {
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
