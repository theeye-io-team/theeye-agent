'use strict';

//var config = require('config');
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
var extend = require('util')._extend;
var Script = require('../../lib/script');
var AbstractWorker = require('../abstract');
var JobsFactory = require('./job')

/**
 *
 * this listen to orders and also send keep alive to the supervisor
 *
 */
module.exports = AbstractWorker.extend({
  jobs: {},
  type: 'listener',
  /**
   * often the resource id is required. 
   * in this case the associated host resource id
   * @param Function (optional) next
   * @return String resource id
   */
  getId : function(next) {
    return this.config.resource_id ;
  },
  /**
   * obteins the data that will be sent to the supervisor
   * @param Function next
   * @return null
   */
  getData : function(next) {
    return next(null,{
      state: 'success',
      data: { message : "agent running" }
    });
  },
  /**
   * process the job received from the supervisor
   * @param Job data
   * @return null
   */
  processJob: function (data) {
    var connection = this.connection
    var debug = this.debug

    var options = {
      connection: connection,
      listener: this
    }

    /**
     *
     * parse job data
     *
     */
    var job = JobsFactory.create(data, options)
    job.getResults(function (err, result) {
      if (err) debug.error('%o',err)
      connection.submitJobResult(job.id, err||result, function(err){
        if (err) debug.error('%o',err)
      })
    })
  },
  /**
   * the procedure to be performed on each worker cicle.
   * @param Function next
   * @return null
   */
  keepAlive: function () {
    var self = this;
    var resource = this.supervisor_resource;

    this.debug.log('querying jobs...');
    this.getJob(function(error,job){
      if (error) {
        self.debug.error('supervisor response error');
        self.debug.error(error);
      } else {
        if (job) {
          self.processJob(job);
        } else {
          self.debug.log('no job to process');
        }
      }
    });

    this.sleep();
  },
  getJob: function (done) {
    this.connection.fetch({
      route: '/:customer/job',
      query: {
        process_next: 1,
        hostname: this.connection.hostname
      },
      failure: function(err){
        done(err)
      },
      success: function(body){
        if (Array.isArray(body.jobs) && body.jobs.length > 0) {
          done(null, body.jobs[0])
        } else {
          done()
        }
      }
    })
  }
})
