'use strict';

var util = require('util');
var debug = require('debug');
var AGENT_FAILURE_STATE = 'agent_failure';

function AbstractWorker (connection,config) {
  if(this.constructor === AbstractWorker) {
    throw new Error("Can't instantiate abstract class!");
  }

  this.config = config;
  this.name = config.name||config.type;
  this.connection = connection;
  this.enable = true;

  this.initialize();
  return this;
}

module.exports = AbstractWorker;

AbstractWorker.prototype = {
  initialize: function() {
  },
  getId : function() {
    return null ;
  },
  keepAlive : function() {
    var self = this;
    this.debug.log(
      'worker "%s" awake customer "%s"', 
      this.name,
      this.connection.client_customer
    );

    this.getData(function(error,data){
      if( error ){
        self.debug.error('worker execution failed.');
        self.debug.error(error);
        self.submitWork({
          state: AGENT_FAILURE_STATE,
          data: { error:error }
        });
        self.debug.log('stopping worker due to errors.');
        self.stop();
      } else {
        data.monitor_name = self.name ;
        self.submitWork(data);
      }
    });

    this.sleep();
  },
  submitWork : function(data,next) {
    this.connection.updateResource(
      this.config.resource_id, data, next
    );
  },
  run : function() {
    this.debug.log('running worker "%s"', this.name);
    this.keepAlive();
  },
  getData : function() {
    this.debug.error("Abstract method!");
    throw new Error("Abstract method!");
  },
  sleep : function() {
    if(!this.enable) return;

    this.debug.log(
      'worker "%s" slept for "%d" seconds', 
      this.name,
      this.config.looptime/1000
    );

    var self = this;
    this.timeout = setTimeout(
      function(){
        return self.keepAlive();
      },
      this.config.looptime
    );
  },
  setConfig : function(config) {
    this.config = config;
    return this;
  },
  getConfig : function() {
    return this.config;
  },
  stop : function() {
    this.enable = false;
    clearTimeout(this.timeout);
    this.debug.log('worker stopped.');
  },
  downloadScript: function(script,done){
    var self = this;
    this.debug.log('getting script %s', script.id);
    var stream = this.connection.scriptDownloadStream(script.id);

    this.debug.log('download stream');
    script.save(stream,function(error){
      if(error){
        self.debug.error(error);
        return done(error);
      }
      self.debug.log('script downloaded');
      done();
    });
  },
  checkScript: function(script,next){
    var self = this;
    script.checkFile(function(success){
      if(!success){ // not present or outdated
        self.debug.log('script need to be downloaded');
        self.downloadScript(script, next);
      } else {
        self.debug.log('script is ok');
        next();
      }
    });
  },
};

/**
 * Define/extend a custom worker structure
 * @param String type
 * @return Worker definition
 */
AbstractWorker.define = function (type) {
  function Worker (connection,config) {
    var name = config.name;
    var part = type + (name?':'+name:'');
    var log = 'eye:agent:worker:' + part
    this.debug = {
      'log': debug(log),
      'error': debug(log + ':error')
    }
    AbstractWorker.apply(this,arguments);
  }
  util.inherits(Worker, AbstractWorker);
  return Worker;
}
