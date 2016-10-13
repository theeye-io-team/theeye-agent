'use strict';

var CLIENT_VERSION = 'v0.9.3' ;
var CLIENT_NAME = 'Golum' ;

var os = require('os');
var fs = require('fs');
var path = require('path');
var request = require('request');
var util = require('util');
var debug = require('debug');

var logger = {
  'debug': debug('eye:client:debug'),
  'error': debug('eye:client:error')
};

var EventEmitter = require('events').EventEmitter;

module.exports = TheEyeClient;

/**
 *
 *
 */
function TheEyeClient (options)
{
  this.access_token = '';

  this.configure(options);

  return this;
}

/**
 *
 *
 */
TheEyeClient.prototype = {
  /**
   *
   * @author Facundo
   * @return undefined
   * @param Object options
   *
   */
  configure: function(options)
  {
    var connection = this;

    logger.debug('theeye api client version %s/%s', CLIENT_NAME, CLIENT_VERSION);

    for(var prop in options) connection[prop] = options[prop];

    connection.api_url = options.api_url||process.env.THEEYE_SUPERVISOR_API_URL ;
    connection.client_id = options.client_id||process.env.THEEYE_SUPERVISOR_CLIENT_ID ;
    connection.client_secret = options.client_secret||process.env.THEEYE_SUPERVISOR_CLIENT_SECRET ;
    connection.client_customer = options.client_customer||process.env.THEEYE_SUPERVISOR_CLIENT_CUSTOMER ;
    connection.access_token = options.access_token||null ;

    logger.debug('connection properties => %o', connection);
    if( ! connection.api_url ) {
      return logger.error('ERROR. supervisor API URL required');
    }

    connection.request = request.defaults({
      proxy: process.env.http_proxy,
      tunnel: false,
      timeout: 5000,
      json: true,
      gzip: true,
      headers: {
        'User-Agent': CLIENT_NAME + '/' + CLIENT_VERSION
      },
      baseUrl: connection.api_url
    });
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

    this.request.post({
      'baseUrl' : this.api_url,
      'url': '/token' ,
      'auth': {
        'user' : this.client_id,
        'pass' : this.client_secret,
        'sendImmediately' : true
      }
    }, function(error,httpResponse,token) {
      if(error) {
        logger.error('unable to get new Token');
        return next(error);
      } else if( httpResponse.statusCode == 200 ){
        logger.debug('successful token refresh %s', JSON.stringify(token));
        connection.access_token = token;

        return next(null, token);
      } else {
        var message = 'token refresh failed ' + JSON.stringify(token);
        logger.error(message);
        return next(new Error(message),null);
      }
    });
  },
  /**
   * handle response data and errors
   * @author Facundo
   */
  processResponse : function(
    request,
    error,
    httpResponse,
    body,
    next
  ){
    var connection = this;

    var callNext = function(error, body){
      if(next) next(error, body, httpResponse);
    }
    if( ! error && /20./.test( httpResponse.statusCode ) ) {
      logger.debug('%s %s request success', request.method, request.url);
      callNext(null,body);
    }
    else // error condition detected
    {
      logger.error('error detected on %s %s', request.method, request.url);
      logger.error(request);
      if(error)
      {
        // could not send data to server
        logger.error('request failed : %s', JSON.stringify(request) );
        logger.error(error.message);
        error.statusCode = httpResponse ? httpResponse.statusCode : null;
        logger.error(body);
        callNext(error, body);
      }
      else if( httpResponse.statusCode == 401 )
      {
        // unauthorized
        logger.error('access denied');
        connection.refreshToken(function(error, token) {
          if(error) {
            logger.error('client could not be authenticated');
            logger.error(error.message);
            error.statusCode = httpResponse.statusCode;
            //throw new Error('agent could not be authenticated');
          }
          callNext(error, body);
        });

      }
      else if(
        (body && body.status == 'error')
        || /40./.test( httpResponse.statusCode )
      ) {
        body = body || {};
        logger.error( JSON.stringify(body) );
        var error = new Error(body.message || 'client error');
        error.data = body || {};
        error.statusCode = httpResponse.statusCode ;
        callNext(error,body);
      }
      else
      {
        logger.error('>>>>>>>>>>>> unhandled error! <<<<<<<<<<<<');
        logger.error('request %s' , JSON.stringify(request) );
        logger.error('status  %s' , httpResponse.statusCode );
        logger.error('error   %s' , error && error.message  );
        logger.error('body    %s' , JSON.stringify(body)    );
        logger.error('>>>>>>>>>>>>>>>>>>>> * <<<<<<<<<<<<<<<<<<<');

        if(!error) {
          error = new Error(JSON.stringify(body));
          error.statusCode = httpResponse.statusCode;
        }

        callNext(error, body);
      }
    }
  },
  /**
   * prepare the request to be sent.
   * append auth data and mandatory parameters
   * @author Facundo
   * @return {Object} Request
   */
  performRequest : function(options, doneFn){
    try {
      var connection = this;
      doneFn||(doneFn=function(){});
      var hostname = this.hostname;
      var customer = this.client_customer;

      var prepareUri = function(options){
        var uri = options.uri||options.url;
        uri = uri.replace(':hostname',hostname);
        uri = uri.replace(':customer',customer);
        return uri;
      }

      var prepareQueryString = function(options){
        // add customer to the qs if not present elsewhere
        var qs = options.qs||{};
        var uri = options.uri||options.url;
        var customer = qs.customer || /:customer/.test(uri) !== false;
        if(!customer) {
          if( connection.client_customer ) {
            qs.customer = connection.client_customer;
          }
        }
        return qs;
      }

      options.qs = prepareQueryString(options);
      options.uri = options.url = prepareUri(options);

      // set authentication method if not provided
      if( ! options.auth ) {
        if( connection.access_token ) {
          options.auth = { bearer : connection.access_token } ;
        }
      }

      var msg = 'requesting %s';
      msg += options.qs ? ' qs: %o' : '';
      logger.debug(msg, options.url, options.qs || '');

      var requestDoneFn = function(error, httpResponse, body){
        connection.processResponse(
          options,
          error,
          httpResponse,
          body,
          doneFn
        );
      }

      return connection.request(options, requestDoneFn);
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
    if( options.id ) url += '/' + options.id;
    if( options.child ) url += '/' + options.child;

    var request = this.performRequest({
      method: 'GET',
      url: url,
      qs: options.query || null
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
      qs: options.query || null
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
      qs: options.query || null
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
  create : function(options) {
    var request = this.performRequest({
      method: 'POST',
      url: options.route,
      body: options.body||null,
      qs: options.query||null
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
    var request = this.performRequest({
      method: 'PUT',
      url: options.route + '/' + options.id,
      body: options.body||null,
      qs: options.query||null
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
      body: options.body || null,
      qs: options.query || null
    },function(error, body){
      if(error) options.failure(error,request);
      else options.success(body,request);
    });
    return request;
  },
  /**
   *
   *
   *
   * agent methods
   *
   *
   *
   */
  getNextPendingJob : function(options,doneFn) {

    var hostname = (options && options.hostname) ? options.hostname : this.hostname;

    this.performRequest({
      method: 'GET',
      url: '/:customer/job',
      qs: {
        process_next: 1,
        hostname: hostname
      }
    }, function(error,body){
      if( ! error ) {
        if(body&&body.jobs) {
          if(Array.isArray(body.jobs)&&body.jobs.length>0){
            doneFn(null, body.jobs[0]);
          }
          else doneFn();
        } else {
          var error = new Error('api response with empty content.');
          logger.error(error);
          doneFn(error);
        }
      } else {
        logger.error('api request error %s.',error);
        logger.error(error);
      }
    });
  },
  /**
   *
   *
   */
  sendAgentKeepAlive : function() {
    this.performRequest({
      method:'put',
      url: '/:customer/agent/:hostname'
    });
  },
  /**
   *
   *
   */
  submitJobResult : function(jobId,result,next) {
    this.performRequest({
      method: 'PUT',
      url: '/:customer/job/' + jobId,
      body: {result:result}
    }, function(error,response){
      if( error ) {
        logger.error('unable to update job');
        if(next) next(error);
      } else {
        logger.debug('job updated');
        if(next) next(null,response);
      }
    });
  },
  /**
   *
   *
   */
  submitDstat : function(dstat,next) {
    this.performRequest({
      url: '/:customer/dstat/:hostname',
      method: 'post',
      body: dstat
    }, next);
  },
  /**
   *
   *
   */
  submitPsaux : function(psaux,next) {
    this.performRequest({
      method: 'post',
      body: psaux,
      url: '/psaux/:hostname'
    }, next);
  },
  /**
   *
   *
   */
  registerAgent : function(data,next) {
    this.performRequest({
      url:'/host/:hostname',
      body:data,
      method:'post'
    }, next);
  },
  /**
   *
   *
   */
  getAgentConfig: function(hostname, next) {
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
  scriptDownloadStream : function(scriptId)
  {
    return this.performRequest({
      method: 'get',
      url: '/:customer/script/' + scriptId  + '/download'
    })
    .on('response', function(response) {
      if(response.statusCode != 200) {
        var error = new Error('get script response error ' + response.statusCode);
        this.emit('error', error);
      }
    });
  },
  updateResource : function(id,resourceUpdates,next) {
    this.performRequest({
      method: 'PUT',
      url: '/:customer/resource/' + id,
      body: resourceUpdates
    }, function(error,response){
      if( error ) {
        logger.error('unable to update resource');
        logger.error(error.message);
        if(next) next(error);
      } else {
        logger.debug('resource updated');
        if(next) next(null,response);
      }
    });
  }
}
