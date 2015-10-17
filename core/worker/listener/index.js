var config = require('config').get('core');
var fs = require('fs');
var path = require('path');
var md5 = require('MD5');
var app = require('../../app');

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
 * @param Function next
 * @return null
 */
Worker.prototype.processJob = function(job, next)
{
  var worker = this;
  worker.debug.log(job);

  if( job.name == 'agent:config:update' ) {
    app.once('config:up-to-date',function(result){
      worker.connection.submitJobResult(job.id, result, 
        function(error,response) {
          if(!error) worker.handleSupervisorResponse(response);
        });
    });
    app.emit('config:need-update');
  } else {
    // by now all custom jobs are scripts to run
    function handleScriptPath (scriptPath) {
      var scriptArgs = job.script_arguments ;
      worker.runScript(scriptPath, scriptArgs, function(err,output) {
        worker.connection.submitJobResult(job.id, output, function(error,response){
          if(!error) worker.handleSupervisorResponse(response);
        });
      });
    }
    worker.getScriptPath(job.script_id, job.script_md5, handleScriptPath);
  }
  if(next) next();
};

/**
 * the process to be performed once on each worker cicle.
 * @param Function next
 * @return null
 */
Worker.prototype.keepAlive = function(next)
{
  var worker = this;
  var resource = worker.supervisor_resource;
  function handleJobResponse (error,job) {
    if( error ) {
      worker.debug.error('supervisor response error');
      worker.debug.error(error);
    } else {
      if(job) {
        worker.debug.log('processing job');
        worker.processJob(job, next);
      }
      else worker.debug.log('no job to process');
    }
  };
  worker.debug.log('querying jobs...');
  worker.connection.getNextPendingJob(handleJobResponse);
  worker.sleep();
};
