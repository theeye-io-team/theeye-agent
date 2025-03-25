const axios = require('axios');
const logger = require('../logger').create('lib:theeye-client')

module.exports = TheEyeClient;

/**
 *
 *
 */
function TheEyeClient (options) {
  this.access_token = '';
  this.configure(options);
  return this;
}

/**
 *
 *
 */
TheEyeClient.prototype = {
  HOST:'/:customer/host',
  /**
   *
   * @author Facundo
   * @return undefined
   * @param Object options
   *
   */
  configure: function (options) {
    var connection = this;

    const agent_version = options.version
    const client_name = (options.name || 'theeye-agent')
    const userAgent = `${client_name}/${agent_version}`

    logger.debug('theeye api client version %s/%s', client_name, agent_version)

    for (var prop in options) {
      connection[prop] = options[prop];
    }

    connection.api_url = options.api_url||process.env.THEEYE_SUPERVISOR_API_URL;
    connection.client_id = options.client_id||process.env.THEEYE_SUPERVISOR_CLIENT_ID;
    connection.client_secret = options.client_secret||process.env.THEEYE_SUPERVISOR_CLIENT_SECRET;
    connection.client_customer = options.client_customer||process.env.THEEYE_SUPERVISOR_CLIENT_CUSTOMER;
    connection.access_token = options.access_token||null;

    logger.debug({ connection })
    if (!connection.api_url) {
      return logger.error('ERROR. Supervisor API URL required');
    }

    options.request||(options.request={});

    let defaults = {
      baseURL: connection.api_url,
      timeout: 5000,
      responseType: 'json',
      headers: {
        'User-Agent': userAgent
      }
    };
    
    if (options.request.headers) {
      defaults.headers = Object.assign(defaults.headers, options.request.headers);
    }
    
    if (options.request.proxy) {
      defaults.proxy = options.request.proxy;
    }

    logger.debug('axios options set to %j', defaults)

    connection.axios = axios.create(defaults);
  },
  /**
   *
   * @author Facundo
   * @return undefined
   * @param Function next
   *
   */
  refreshToken : function(next) {
    next||(next=function(){});
    var connection = this;

    if(!this.client_id || !this.client_secret){
      logger.debug('no credentials!');
      var error = new Error('no credential provided. client_id & client_secret required');
      return next(error);
    }

    logger.debug('sending new authentication request');

    this.axios.post('/token', null, {
      auth: {
        username: this.client_id,
        password: this.client_secret
      }
    })
    .then(response => {
      if (response.status === 200) {
        logger.debug('successful token refresh %s', JSON.stringify(response.data));
        connection.access_token = response.data;
        return next(null, response.data);
      } else {
        throw new Error('Unexpected status code: ' + response.status);
      }
    })
    .catch(error => {
      logger.error('unable to get new Token');
      return next(error);
    });
  },
  /**
   * handle response data and errors
   * @author Facundo
   */
  processResponse (requestConfig, error, response, next) {
    const connection = this;

    // Helper function to call next callback with proper arguments
    const callNext = function(error, body) {
      if (next) next(error, body, response);
    }

    // Successful response
    if (!error && response && response.status >= 200 && response.status < 300) {
      return callNext(null, response.data);
    }
    
    // Error handling
    if (error) {
      // Handle authentication errors with token refresh and retry
      if (error.response && error.response.status === 401) {
        logger.error('request authentication error. access denied.');
        
        // Refresh token and retry the original request
        return connection.refreshToken((err, token) => {
          if (err) {
            logger.error('token refresh failed: %s', err.message);
            return callNext(err, error.response ? error.response.data : null);
          }
          
          logger.debug('token refreshed, retrying original request');
          
          // Clone the original request config and add the new token
          const retryConfig = { ...requestConfig };
          if (!retryConfig.headers) retryConfig.headers = {};
          retryConfig.headers['Authorization'] = `Bearer ${token}`;
          
          // Retry the request with the new token
          connection.axios(retryConfig)
            .then(retryResponse => {
              connection.processResponse(retryConfig, null, retryResponse, next);
            })
            .catch(retryError => {
              logger.error('request retry failed after token refresh');
              connection.processResponse(retryConfig, retryError, retryError.response, next);
            });
        });
      }
      
      // Handle other errors
      const statusCode = error.response ? error.response.status : 504;
      const body = error.response ? error.response.data : null;
      let message;

      // Categorize errors by status code
      if (statusCode >= 400 && statusCode < 500) {
        message = `client error (${statusCode})`;
      } else if (statusCode >= 500) {
        message = `server error (${statusCode})`;
      } else {
        message = 'unknown request error';
        
        // Log detailed information for unknown errors
        logger.error('############ UNKNOWN ERROR ############');
        logger.error('REQUEST > %s', JSON.stringify(requestConfig));
        logger.error('STATUS  > %s', statusCode);
        logger.error('ERROR   > %s', error.message || 'No error message');
        logger.error('BODY    > %s', body ? JSON.stringify(body) : 'No body');
        logger.error('#######################################');
      }

      // Create a standardized error object
      const responseError = new Error(body ? (body.message || JSON.stringify(body)) : message);
      responseError.body = body;
      responseError.statusCode = statusCode;
      responseError.originalError = error;
      
      return callNext(responseError, body);
    }
    
    // Edge case: no error object but non-2xx response
    if (response && (response.status < 200 || response.status >= 300)) {
      const statusCode = response.status;
      const body = response.data;
      const message = `Unexpected response status: ${statusCode}`;
      
      logger.warn(message);
      
      const responseError = new Error(body ? (body.message || JSON.stringify(body)) : message);
      responseError.body = body;
      responseError.statusCode = statusCode;
      
      return callNext(responseError, body);
    }
    
    // Fallback for unexpected cases
    return callNext(new Error('Unknown error in processResponse'), null);
  },
  /**
   * prepare the request to be sent.
   * append auth data and mandatory parameters
   * @author Facundo
   * @return {Object} Request
   */
  performRequest (options, doneFn) {
    try {
      doneFn||(doneFn=function(){});
      const connection = this
      const hostname = this.hostnameFn()
      const customer = this.client_customer

      const prepareUri = function(options){
        let uri = options.uri||options.url;
        uri = uri.replace(':hostname',hostname);
        uri = uri.replace(':customer',customer);
        return uri;
      }

      const prepareQueryString = function(options){
        // add customer to the qs if not present elsewhere
        const params = options.params || options.qs || {};
        const uri = options.uri||options.url;
        const customer = params.customer || /:customer/.test(uri) !== false;
        if(!customer) {
          if( connection.client_customer ) {
            params.customer = connection.client_customer;
          }
        }
        return params;
      }

      const axiosConfig = {
        method: options.method,
        url: prepareUri(options),
        params: prepareQueryString(options),
        data: options.body,
        responseType: 'json'
      };

      // Handle formData if present
      if (options.formData) {
        const FormData = require('form-data');
        const formData = new FormData();
        for (const key in options.formData) {
          formData.append(key, options.formData[key]);
        }
        axiosConfig.data = formData;
        axiosConfig.headers = formData.getHeaders();
      }

      // set authentication method if not provided
      if (!options.auth) {
        if (connection.access_token) {
          axiosConfig.headers = {
            ...axiosConfig.headers,
            'Authorization': `Bearer ${connection.access_token}`
          };
        }
      } else {
        axiosConfig.auth = options.auth;
      }

      var msg = 'requesting %s';
      msg += axiosConfig.params ? ' params: %o' : '';
      logger.debug(msg, axiosConfig.url, axiosConfig.params || '');

      // Create a promise that axios can cancel
      let request = { 
        cancel: null, 
        isAborted: false,
        abort: function() {
          this.isAborted = true;
          if (this.cancel) this.cancel();
        } 
      };
      
      const cancelToken = axios.CancelToken.source();
      request.cancel = cancelToken.cancel;
      axiosConfig.cancelToken = cancelToken.token;

      connection.axios(axiosConfig)
        .then(response => {
          if (!request.isAborted) {
            connection.processResponse(axiosConfig, null, response, doneFn);
          }
        })
        .catch(error => {
          if (!request.isAborted) {
            connection.processResponse(axiosConfig, error, error.response, doneFn);
          }
        });

      return request;
    } catch (e) {
      logger.error('request could not be completed');
      logger.error(e);
      doneFn(e);
    }
  },
  /**
   * get request wrapper
   * @author Facundo
   * @return Request connection.request
   */
  get: function(options) {
    var url = options.route;
    if (options.id) url += '/' + options.id;
    if (options.child) url += '/' + options.child;

    var request = this.performRequest({
      method: 'GET',
      url: url,
      qs: (options.query||undefined)
    },function(error, body){
      if(error) options.failure(error,request);
      else options.success(body,request);
    });
    return request;
  },
  /**
   * get fetch request wrapper
   * @author Facundo
   * @return Request connection.request
   */
  fetch: function(options){
    var url = options.route;
    var request = this.performRequest({
      method: 'GET',
      url: url,
      qs: (options.query||undefined)
    },function(error, body){
      if(error) options.failure(error,request);
      else options.success(body,request);
    });
    return request;
  },
  /**
   * delete request wrapper
   * @author Facundo
   * @return Request connection.request
   */
  remove : function(options) {
    var url = options.route;
    if( options.id ) url += '/' + options.id;
    if( options.child ) url += '/' + options.child;

    var request = this.performRequest({
      method: 'DELETE',
      url: url,
      qs: (options.query||undefined)
    }, function(error, body){
      if(error) options.failure(error, request);
      else options.success(body, request);
    });
  },
  /**
   * post request wrapper
   * @author Facundo
   * @return Request connection.request
   */
  create: function(options) {
    var request = this.performRequest({
      method: 'POST',
      url: options.route,
      formData: (options.formData||undefined),
      body: (options.body||undefined),
      qs: (options.query||undefined)
    },function(error, body){
      if(error) options.failure(error,request);
      else options.success(body,request);
    });
    return request;
  },
  /**
   * put request wrapper
   * @author Facundo
   * @return Request connection.request
   */
  update : function(options) {
    var url = options.route;
    if( options.id ) url += '/' + options.id;
    if( options.child ) url += '/' + options.child;

    var request = this.performRequest({
      method: 'PUT',
      url: url,
      formData: (options.formData||undefined),
      body: (options.body||undefined),
      qs: (options.query||undefined)
    },function(error, body){
      if(error) options.failure(error,request);
      else options.success(body,request);
    });
    return request;
  },
  /**
   * patch request wrapper
   * @author Facundo
   * @return Request connection.request
   */
  patch : function(options) {
    var url = options.route;
    if( options.id ) url += '/' + options.id;
    if( options.child ) url += '/' + options.child;

    var request = this.performRequest({
      method: 'PATCH',
      url: url,
      body: (options.body||undefined),
      qs: (options.query||undefined)
    },function(error, body){
      if(error) options.failure(error,request);
      else options.success(body,request);
    });
    return request;
  },
  /**
   *
   *
   */
  submitJobResult: function(jobId, result, next) {
    this.performRequest({
      method: 'PUT',
      url: '/:customer/job/' + jobId,
      body: { result }
    }, function (error, response) {
      if (error) {
        logger.error('unable to update job')
        if (next) {
          next(error)
        }
      } else {
        logger.debug('job updated')
        if (next) {
          next(null,response)
        }
      }
    })
  },
  /**
   *
   *
   */
  getAgentConfig: function(next) {
    this.performRequest({
      method:'get',
      url:  '/:customer/agent/:hostname/config'
    },function(error,body){
      if( error ) {
        logger.error('request error');
        logger.error(error.message);
        next(error,null);
      } else {
        if( ! body || ! body instanceof Object ) {
          logger.error('respose body error. no config found');
          logger.error(body);
          next(error,null);
        } else {
          logger.debug('agent config fetch success');
          logger.debug('%j', body);
          next(null,body);
        }
      }
    });
  },
  scriptDownloadStream : function(scriptId) {
    const axiosConfig = {
      method: 'get',
      url: `/:customer/script/${scriptId}/download`,
      responseType: 'stream'
    };
    
    const hostname = this.hostnameFn();
    const customer = this.client_customer;
    axiosConfig.url = axiosConfig.url.replace(':hostname', hostname).replace(':customer', customer);
    
    if (this.access_token) {
      axiosConfig.headers = {
        'Authorization': `Bearer ${this.access_token}`
      };
    }
    
    return this.axios(axiosConfig)
      .then(response => {
        if (response.status !== 200) {
          throw new Error('get script response error ' + response.status);
        }
        return response.data;
      })
      .catch(error => {
        throw error;
      });
  },
  fileDownloadStream: function(id) {
    const axiosConfig = {
      method: 'GET',
      url: `/:customer/file/${id}/download`,
      responseType: 'stream'
    };
    
    const hostname = this.hostnameFn();
    const customer = this.client_customer;
    axiosConfig.url = axiosConfig.url.replace(':hostname', hostname).replace(':customer', customer);
    
    if (this.access_token) {
      axiosConfig.headers = {
        'Authorization': `Bearer ${this.access_token}`
      };
    }
    
    return this.axios(axiosConfig)
      .then(response => {
        if (response.status !== 200) {
          throw new Error('get file response error ' + response.status);
        }
        return response.data;
      })
      .catch(error => {
        throw error;
      });
  },
  updateResource : function(id,resourceUpdates,next) {
    this.performRequest({
      method: 'PATCH',
      url: '/:customer/resource/' + id + '/state',
      body: resourceUpdates
    }, function(error,response){
      if (error) {
        logger.error('unable to update resource');
        logger.error(error.message);
        if (next) next(error);
      } else {
        logger.debug('resource updated');
        if (next) next(null,response);
      }
    });
  }
}
