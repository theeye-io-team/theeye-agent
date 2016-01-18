var fs = require('fs');
var join = require('path').join;
var md5 = require('md5');

var execFile = require('child_process').execFile;

var AGENT_FAILURE_STATE = 'agent_failure';

var Worker = module.exports = function Worker(connection,config) {
  if (this.constructor === Worker) {
    throw new Error("Can't instantiate abstract class!");
  }

  this.config = config;
  this.name = config.name ? config.name : config.type;
  this.connection = connection;
  this.enable = true;

  this.initialize();
}

Worker.prototype = {
  getId : function() {
    return null ;
  },
  keepAlive : function() {
    var self = this;
    self.debug.log(
      'worker "%s" awake customer "%s"', 
      self.name,
      self.connection.client_customer
    );

    self.getData(function(error,data) {
      if( ! error ) {
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

    self.sleep();
  },
  submitWork : function(data,next) {
    var self = this;
    self.connection.updateResource(
      self.config.resource_id, 
      data, 
      next
    );
  },
  run : function() {
    var self = this;
    self.debug.log('running worker "%s"', self.name);
    self.keepAlive();
  },
  getData : function() {
    var self = this ;
    self.debug.error("Abstract method!");
    throw new Error("Abstract method!");
  },
  sleep : function() {
    var self = this;
    if(!self.enable) return;

    self.debug.log(
      'worker "%s" slept for "%d" seconds', 
      self.name,
      self.config.looptime/1000
    );

    self.timeout = setTimeout(function(){
      self.keepAlive()
    }, self.config.looptime);
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
  getScriptPath : function(scriptId, scriptMD5, next) {
    var worker = this;
    var scriptPath = join( process.env.THEEYE_AGENT_SCRIPT_PATH, scriptId );

    fs.exists(scriptPath,function(exists){
      var download=false;
      if( !exists ) download=true;
      else {
        var buf = fs.readFileSync(scriptPath);
        if( md5(buf) != scriptMD5 ){
          worker.debug.log('script MD5 has changed. download require');
          var download=true;
        }
      }

      if(download) {
        worker.debug.log('getting script %s', scriptId);
        worker.connection.downloadScript(scriptId,scriptPath,function(error){
          if(!error) {
            worker.debug.log('script downloaded');
            next(scriptPath);
          } else {
            worker.debug.error('unable to download job script');
            worker.debug.error(error.message);
          }
        });
      } else {
        worker.debug.log('script exists in local storage');
        next(scriptPath);
      }
    });
  },
  runScript: function(path, args, next) {
    var worker = this;
    execFile(path, args, function (exitCode, stdout, stderr){
      var output = {
        stdout: stdout, 
        stderr: stderr, 
        code: exitCode 
      };
      worker.debug.log(output);
      next(null,output);
    });
  },
  initialize: function() {
  }
}
