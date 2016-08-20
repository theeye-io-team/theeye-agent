"use strict";

var config = require('config').get('core');
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var app = require(APP_ROOT + '/app');
var Script = require(APP_ROOT + '/lib/script');

/**
 *
 * just listen to supervisor orders
 *
 */
var Worker = module.exports = require('../index').define('listener');

/**
 * often the resource id is required. 
 * in this case the asociated host resource id
 * @param Function (optional) next
 * @return String resource id
 */
Worker.prototype.getId = function(next) {
  return this.config.resource_id ;
};

/**
 * obteins the data that will be sent to the supervisor
 * @param Function next
 * @return null
 */
Worker.prototype.getData = function(next) {
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
Worker.prototype.processJob = function(job)
{
  var worker = this;

  if( job.name == 'agent:config:update' ) {
    app.once('config:up-to-date',function(result){
      worker.connection
        .submitJobResult(job.id, result);
    });
    app.emit('config:need-update');
  } else {
    var path = process.env.THEEYE_AGENT_SCRIPT_PATH;
    var script = new Script({
      id: job.script.id,
      args: job.task.script_arguments,
      runas: job.task.script_runas,
      filename: job.script.filename,
      md5: job.script.md5,
      path: path,
    });

    this.checkScript(script,function(error){
      // if(error) return done(error);
      script.run()
      .on('end',function(result){
        worker.connection
        .submitJobResult(job.id, result);
      });
    });
  }
}

/**
 * the process to be performed once on each worker cicle.
 * @param Function next
 * @return null
 */
Worker.prototype.keepAlive = function()
{
  var worker = this;
  var resource = worker.supervisor_resource;

  worker.debug.log('querying jobs...');
  worker.connection.getNextPendingJob({}, function(error,job){
    if(error) {
      worker.debug.error('supervisor response error');
      worker.debug.error(error);
    } else {
      if(job) worker.processJob(job);
      else worker.debug.log('no job to process');
    }
  });

  // send keep alive
  worker.debug.log('sending keep alive...');
  worker.connection.sendAgentKeepAlive();

  worker.sleep();
};
