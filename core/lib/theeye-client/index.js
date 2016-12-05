'use strict';

var CLIENT_VERSION = 'v0.9.8' ;
var CLIENT_NAME = 'Golum' ;
var CLIENT_USER_AGENT = CLIENT_NAME + '/' + CLIENT_VERSION ;

var os = require('os');
var fs = require('fs');
var path = require('path');
var util = require('util');
var request = require('request');
var debug = require('debug');

var logger = {
  'debug': debug('eye:client:debug'),
  'error': debug('eye:client:error')
};


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
  HOST:'/:customer/host',
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

    for (var prop in options) {
      connection[prop] = options[prop];
    }

    connection.api_url = options.api_url||process.env.THEEYE_SUPERVISOR_API_URL ;
    connection.client_id = options.client_id||process.env.THEEYE_SUPERVISOR_CLIENT_ID ;
    connection.client_secret = options.client_secret||process.env.THEEYE_SUPERVISOR_CLIENT_SECRET ;
    connection.client_customer = options.client_customer||process.env.THEEYE_SUPERVISOR_CLIENT_CUSTOMER ;
    connection.access_token = options.access_token||null ;

    logger.debug('connection properties => %o', connection);
    if (!connection.api_url) {
      return logger.error('ERROR. Supervisor API URL required');
    }

    connection.request = request.defaults({
      proxy: options.proxy||process.env.http_proxy,
      tunnel: false,
      timeout: (options.timeout||5000),
      json: true,
      gzip: true,
      headers: {
        'User-Agent': CLIENT_USER_AGENT
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

    if( !error && /20./.test(httpResponse.statusCode) ) {
      return callNext(null,body);
    } else if( error ){
      return callNext(error);
    } else if( httpResponse ) {
      if( httpResponse.statusCode == 401 ) {

        // AuthError Unauthorized
        var msg = 'request authentication error. access denied.';
        var err = new Error(msg);
        logger.error(err);

        connection.refreshToken(function(error, token) {
          if(error) logger.error(error.message);
          callNext(error, body);
        });

      } else {
        var message ;

        if( /40./.test(httpResponse.statusCode) ) {

          message='client error';

        } else if( /50./.test(httpResponse.statusCode) ){

          message='server error';

        } else {

          message='unknown request error';

          logger.error('############ UNKNOWN ERROR ############');
          logger.error('REQUEST > %s' , JSON.stringify(request) );
          logger.error('STATUS  > %s' , httpResponse.statusCode );
          logger.error('ERROR   > %j' , error );
          logger.error('BODY    > %j' , JSON.stringify(body) );
          logger.error('#######################################');

        }

        var error = new Error(!body?message:(body.message||body));
        error.body = body;
        error.statusCode = httpResponse.statusCode||504;
        return callNext(error, body);
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
