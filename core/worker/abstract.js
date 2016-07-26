"use strict";

const AGENT_FAILURE_STATE = 'agent_failure';

function Worker (connection,config) {
  if(this.constructor === Worker) {
    throw new Error("Can't instantiate abstract class!");
  }

  this.config = config;
  this.name = config.name||config.type;
  this.connection = connection;
  this.enable = true;

  this.initialize();
  return this;
}

module.exports = Worker;

Worker.prototype = {
  initialize: function() {
  },
  getId : function() {
    return null ;
  },
  keepAlive : function() {
    const self = this;
    this.debug.log(
      'worker "%s" awake customer "%s"', 
      this.name,
      this.connection.client_customer
    );

    this.getData(function(error,data){
      if(!error) {
        data.agent_name = self.name ;
        self.submitWork(data);
      } else {
        self.debug.error('worker execution failed.');
        self.submitWork({
          state: AGENT_FAILURE_STATE,
          data: { error:error }
        });
        self.debug.log('stopping worker due to errors.');
        self.stop();
      }
    });

    this.sleep();
  },
  submitWork : function(data,next) {
    this.debug.log('submiting work result "%j"', data);
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

    this.timeout = setTimeout(
      () => this.keepAlive(),
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
    this.debug.log('getting script %s', script.id);
    var stream = this.connection.scriptDownloadStream(script.id);

    this.debug.log('download stream');
    script.save(stream,(error)=>{
      if(error){
        this.debug.error(error);
        return done(error);
      }
      this.debug.log('script downloaded');
      done();
    });
  },
  checkScript: function(script,next){
    script.checkFile(success=>{
      if(!success){ // not present or outdated
        this.debug.log('script need to be downloaded');
        this.downloadScript(script, next);
      } else {
        this.debug.log('script is ok');
        next();
      }
    });
  },
}
