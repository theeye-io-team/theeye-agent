'use strict';

//var config = require('config');
var fs = require('fs');
var path = require('path');
var md5 = require('md5');
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
  processJob: function (jobData, done) {
    const connection = this.connection
    const debug = this.debug
    const options = {
      connection: connection,
      listener: this
    }

    /**
     *
     * process job jobData
     *
     */
    const job = JobsFactory.create(jobData, options)
    job.getResults((err, result) => {
      if (err) {
        debug.error('%o', err)
      }

      let payload = (err || result)
      connection.submitJobResult(job.id, payload, (err) => {
        if (err) {
          debug.error('%o', err)
        }
        done(err)
      })
    })
  },
  /**
   * the procedure to be performed on each worker cicle.
   * @param Function next
   * @return null
   */
  keepAlive: function () {
    var resource = this.supervisor_resource
    var multitasking = this.config.multitasking

    this.debug.log('fetching jobs')
    this.getJob((err, job) => {
      if (err) {
        this.debug.error('supervisor response error')
        this.debug.error(err)
        this.rest()
      } else {
        if (job) {
          this.processJob(job, () => {
            if (multitasking === false) { this.rest(0) }
          })
          // rest and then fetch the next job
          if (multitasking !== false) { this.rest() }
        } else {
          this.debug.log('no job to process')
          this.rest()
        }
      }
    })
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
