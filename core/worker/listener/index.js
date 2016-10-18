"use strict";

var config = require('config').get('core');
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var App = require(APP_ROOT + '/app');
var Script = require(APP_ROOT + '/lib/script');
var Worker = require('../index');
var extend = require('util')._extend;

/**
 *
 * this listen to orders and also send keep alive to the supervisor
 *
 */
var Listener = module.exports = Worker.define('listener');

/**
 * often the resource id is required. 
 * in this case the asociated host resource id
 * @param Function (optional) next
 * @return String resource id
 */
Listener.prototype.getId = function(next) {
  return this.config.resource_id ;
};

/**
 * obteins the data that will be sent to the supervisor
 * @param Function next
 * @return null
 */
Listener.prototype.getData = function(next) {
  var self = this;
  var data = { 
    state : { message : "agent running" } 
  };
  return next(null,data);
};

/**
 * process the job received from the supervisor
 * @param Job data
 * @return null
 */
Listener.prototype.processJob = function(job) {
  var worker = this;
  /**
  *
  * job factory
  *
  */
  function Job (attribs) {
    // @TODO this should be a job type to add to the factory
    if( attribs.name == 'agent:config:update' ) {
      return new Job.AgentUpdateJob(attribs);
    } else {
      var name = attribs._type;
      if(!name) throw new Error('invalid job. no type specified');
      return new Job[name](attribs);
    }
  }
  //
  // agent config update job
  //
  Job.AgentUpdateJob = function(specs){
    this.id = specs.id;
    this.process = function(done){
      App.once('config:up-to-date',done);
      App.emit('config:need-update');
    }
    return this;
  }
  //
  // scraper job
  //
  Job.ScraperJob = function(specs) {
    this.id = specs.id;
    this.process = function(done){
      // prepare config
      var config = extend(specs.task,{ type: 'scraper' });
      // invoke worker
      var scraper = Worker.spawn(config, App.connection);
      scraper.getData(function(err,result){
        return done(result);
      });
    }
    return this;
  }
  //
  // script job
  //
  Job.ScriptJob = function(specs) {
    this.id = specs.id;
    this.process = function(done){
      // prepare config
      var config = {
        disabled: false,
        type: 'script',
        script: {
          id: specs.script.id,
          arguments: specs.task.script_arguments,
          runas: specs.task.script_runas,
          filename: specs.script.filename,
          md5: specs.script.md5,
        }
      };
      // invoke worker
      var script = Worker.spawn(config, App.connection);
      script.getData(function(err,result){
        return done(result);
      });
    }
    return this;
  }

  /**
  *
  * parse job data
  *
  */
  var job = new Job(job);
  job.process(function(result){
    worker.connection.submitJobResult(job.id, result);
  });
}

/**
 * the process to be performed once on each worker cicle.
 * @param Function next
 * @return null
 */
Listener.prototype.keepAlive = function() {
  var self = this;
  var resource = this.supervisor_resource;

  this.debug.log('querying jobs...');
  this.connection.getNextPendingJob({}, function(error,job){
    if(error) {
      self.debug.error('supervisor response error');
      self.debug.error(error);
    } else {
      if(job) self.processJob(job);
      else self.debug.log('no job to process');
    }
  });

  // send keep alive
  this.debug.log('sending keep alive...');
  this.connection.sendAgentKeepAlive();
  this.sleep();
};
