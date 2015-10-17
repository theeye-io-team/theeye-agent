var os = require('os');
var fs = require('fs');
var _ = require('underscore');
var hostname = require('./lib/hostname');
var debug = require('debug')('eye:agent:connection');

function Connection(options) {
  this.setOptions(options);
  this.token = '';
}

var CLIENT_VERSION = 'v0.0.0-beta' ;
var CLIENT_NAME = 'TheeyeGolum' ;

Connection.prototype = {
  setOptions : function(options) {
    // if process.env.THEEYE_SUPERVISOR_CLIENT_*** is not set
    // the request will fail
    if( ! options.client_id ) {
      debug('set client id from environment');
      options.client_id = process.env.THEEYE_SUPERVISOR_CLIENT_ID ;
    } else {
      debug('config client id present. take precedence');
    }

    if( ! options.client_secret ) {
      debug('set client secret from environment');
      options.client_secret = process.env.THEEYE_SUPERVISOR_CLIENT_SECRET ;
    } else {
      debug('config client secret present. take precedence');
    }

    if( ! options.client_customer ) {
      debug('set client customer from environment');
      options.client_customer = process.env.THEEYE_SUPERVISOR_CLIENT_CUSTOMER ;
    } else {
      debug('config client customer present. take precedence');
    }

    if( ! options.api_url ) {
      debug('set api url from environment');
      options.api_url = process.env.THEEYE_SUPERVISOR_API_URL ;
    } else {
      debug('config api url present. take precedence');
    }

    // set all properties. if not all are valid...who cares!?
    for(var prop in options) {
      this[prop] = options[prop];
    }

    debug('connection options => %o', options);

    if( ! options.api_url ) {
      console.error('ERROR supervisor API URL required');
      process.exit();
    }

    debug('theeye api client version %s/%s', CLIENT_NAME, CLIENT_VERSION);

    this.request = require('request').defaults({
      proxy: process.env.http_proxy,
      tunnel: false,
      timeout: 5000,
      json: true,
      gzip: true,
      headers: { 'User-Agent': CLIENT_NAME + '/' + CLIENT_VERSION },
      baseUrl: options.api_url
    });
  },
  generateQueryString : function(obj) {
    var str = [];
    for(var p in obj) {
      var val = obj[p] ;
      if (obj.hasOwnProperty(p) && typeof val != 'undefined' ) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    }
    return str.join("&");
  },
  generateRequestUri : function(route,queryParams) {
    var self = this;

    if( typeof queryParams != "object" )
      queryParams = {} ;

    var queryString = self.generateQueryString(queryParams);

    route = route.replace(':customer' , this.client_customer);
    route = route.replace(':hostname' , hostname);

    return queryString!=''? route + '?' + queryString : route ;
  },
  get: function(route,query,next) {
    var self = this ;
    var url = self.generateRequestUri(route,query);

    var options = {
      method : 'GET',
      url : url
    };

    if( self.token )
      options.auth = { bearer : self.token } ;

    this.request.get(options,function(err,httpResponse,body){
      self.processResponse(options,err,httpResponse,body,next);
    });
  },
  post: function(route, queryParams, bodyParams, next) {
    var self = this ;

    var url = self.generateRequestUri(route,queryParams);

    /**
    * @todo if the token is not valid
    * the data is not received by the server.
    * should retry !!!
    */
    var options = {
      method: 'POST',
      url: url,
      body: bodyParams
    };

    if( self.token ) options.auth = { bearer : self.token } ;

    self.request.post(options, function(err, httpResponse, body){
      self.processResponse(options,err,httpResponse,body,next);
    });
  },
  put : function(route,queryParams,bodyParams,next) {
    var self = this ;

    var url = self.generateRequestUri(route,queryParams);

    var options = {
      method: 'PUT',
      url: url, 
      body: bodyParams
    };

    if( self.token )
      options.auth = { bearer : self.token } ;

    self.request.put(options, function(err,httpResponse,body){
      self.processResponse(options, err, httpResponse, body, next);
    });
  },
  processResponse : function(request,error,httpResponse,body,next) {
    var self = this;

    if( ! error && httpResponse.statusCode == 200 )
    {
      debug("%s %s request success", request.method, request.url);
      if(next) next(null,body);
    }
    else // error condition detected
    {
      debug(request);
      if(error) // could not send data to server
      {
        debug("request failed : %s", JSON.stringify(request) );
        debug(error.message);
        debug(body);
      } // unauthorized
      else if( httpResponse.statusCode == 401 )
      {
        debug("access denied");

        self.refreshToken(function(error, token)
        {
          if(error)
          {
            debug("agent could not be authenticated");
            debug(error.message);

            process.exit(0);
          }
          else
          {
            self.token = token;

            if(next) next(error,body);
          }
        });
      }
      else if( body.status == 'error' )
      {
        var error = new Error(body.message);
        error.statusCode = httpResponse.statusCode ;
        next(error,body);
      }
      else
      {
        debug(">>>>>>>>>>>> unhandled error! <<<<<<<<<<<<");
        debug("request %s" , JSON.stringify(request) ); 
        debug("status  %s" , httpResponse.statusCode ); 
        debug("error   %s" , error && error.message  ); 
        debug("body    %s" , JSON.stringify(body)    ); 
        debug(">>>>>>>>>>>>>>>>>>>> * <<<<<<<<<<<<<<<<<<<");

        next(error,body);
        //process.exit(0);
      }
    }
  },
  refreshToken : function(next) {
    var self = this;

    var route = '/' + this.client_customer + '/token/' + hostname ;

    debug('sending new authentication request to %s', route);

    this.request.post({
      'baseUrl' : this.api_url,
      'url': route ,
      'auth': {
        'user' : this.client_id,
        'pass' : this.client_secret,
        'sendImmediately' : true
      }
    },
    function(error,httpResponse,token)
    {
      if(error) {
        debug("unable to get new Token");
        return next(error);
      } else if( httpResponse.statusCode == 200 ){
        debug("successful token refresh %s", JSON.stringify(token));
        return next(null, token);
      } else {
        var message = "token refresh failed " + JSON.stringify(token);
        debug(message);
        return next(new Error(message),null);
      }
    });
  },
  /**
  *
  *
  *
  * metodos para ser movidos al cliente del supervisor
  *
  *
  *
  */
  getNextPendingJob : function(callback) {
    var route = '/:customer/job' ;
    var query = { 
      process_next : 1 ,
      hostname : hostname
    };

    this.get( route, query, function(error,body){
      if( ! error )
      {
        if( body.data && body.data.jobs ) {
          callback(error, body.data.jobs[0]);
        } else {
          debug('getNextPendingJob : body content error');
        }
      } else {
        debug('getNextPendingJob : request error');
        debug(error);
      }
    });
  },
  sendAgentKeepAlive : function() {
    var route = '/:customer/agent/:hostname' ;
    this.put(route);
  },
  downloadScript : function(scriptId,destinationPath,next) {
    var route = '/script/download/' + scriptId ;

    var url = this.generateRequestUri(route);

    var writable = fs.createWriteStream( destinationPath, { mode:0755 } );

    this.request.get(url)
    .on('response', function(response) {
      if(response.statusCode != 200) {
        this.emit('error', new Error('get script response error ' + response.statusCode));
      }
    })
    .on('error',function(error){
      debug('request produce an error');
      debug(error.message);
    })
    .pipe( writable )
    .on('finish',function(){
      if(next) next();
    });
  },
  submitJobResult : function(jobId,result,next) {
    var self = this ;
    var route = '/:customer/job/' + jobId ;

    this.put(route, {}, {result:result}, function(error,response) {
      if( error )
      {
        debug('unable to update job');
        if(next) next(error);
      }
      else
      {
        debug('job updated');
        if(next) next(null,response);
      }
    });
  },
  updateResource : function(resourceId,resourceUpdates,next) {
    var self = this ;
    var route = '/resource/' + resourceId ;

    this.put(route, {}, resourceUpdates, function(error,response) {
      if( error )
      {
        debug('unable to update resource');
        debug(error.message);
        if(next) next(error);
      }
      else
      {
        debug('resource updated');
        if(next) next(null,response);
      }
    });
  },
  submitDstat : function(dstat,next) {
    var route = '/:customer/dstat/:hostname' ;
    this.post(route,{},dstat,next);
  },
  submitPsaux : function(psaux,next) {
    var route = '/:customer/psaux/:hostname' ;
    this.post(route,{},psaux,next);
  },
  registerAgent : function(data,next) {
    var route = '/host/:hostname?customer=:customer' ;
    this.post(route,{},data,next);
  },
  getAgentConfig : function(hostname, next) {
    var self = this;
    var route = '/agent/config/:hostname'.replace(':hostname', hostname) ;

    var query = {};
    this.get(route,query,function(error,body){
      if( error ) {
        debug('getAgentConfig : request error');
        debug(error.message);
        next(error,null);
      } else {
        if( ! body.data || ! body.data.config ) {
          debug('getAgentConfig : respose body error. no "data" property found');
          debug(body);
          next(error,null);
        } else {
          debug('%j', body.data.config);
          debug('agent config fetch success');
          next(null,body.data.config);
        }
      }
    });
  }
}

module.exports = Connection;
