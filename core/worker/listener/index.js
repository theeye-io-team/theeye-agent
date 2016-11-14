"use strict";

var config = require('config').get('core');
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var extend = require('util')._extend;
var Script = require('../../lib/script');
var AbstractWorker = require('../abstract');
var App = require('../../app');

/**
 *
 * this listen to orders and also send keep alive to the supervisor
 *
 */
var Listener = AbstractWorker.define('listener');

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
  return next(null,{
    state: 'success',
    data: { message : "agent running" }
  });
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
      var scraper = require('../index').spawn(config, worker.connection);
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
      var script = require('../index').spawn(config, worker.connection);
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
Listener.prototype.keepAlive = function () {
  var self = this;
  var resource = this.supervisor_resource;

  this.debug.log('querying jobs...');
  this.getJob(function(error,job){
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
  this.sendKeepAlive();
  this.sleep();
};

Listener.prototype.sendKeepAlive = function () {
  var self = this;
  this.connection.update({
    route:'/:customer/agent/:hostname',
    failure:function(err){
      self.debug.error(err);
    },
    success:function(body){}
  });
}

Listener.prototype.getJob = function (done) {
  this.connection.fetch({
    route:'/:customer/job',
    query: {
      process_next: 1,
      hostname: this.connection.hostname
    },
    failure:function(err){
      done(err);
    },
    success:function(body){
      if( Array.isArray(body.jobs) && body.jobs.length > 0 ){
        done(null, body.jobs[0]);
      } else {
        done();
      }
    }
  });
},

module.exports = Listener;
