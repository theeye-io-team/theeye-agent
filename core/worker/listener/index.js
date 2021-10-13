
//var config = require('config');
const fs = require('fs');
const path = require('path');
var Script = require('../../lib/script');
var AbstractWorker = require('../abstract');
var JobsFactory = require('./job')

/**
 *
 * this listen to orders and also send keep alive to the supervisor
 *
 */
module.exports = AbstractWorker.extend({
  initialize () {
    this.config.multitasking_limit || (this.config.multitasking_limit = 1)
    this.running_queue = 0
  },
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
  /**
   * the steps to be performed on each worker cicle.
   * @param Function next
   * @return null
   */
  keepAlive () {
    const resource = this.supervisor_resource
    const { multitasking_limit, multitasking } = this.config

    this.debug.log('fetching jobs')
    this
      .getJob()
      .catch(err => {
        this.debug.error('supervisor response error')
        this.debug.error(err)
        this.rest()
      })
      .then(job => {
        if (!job) {
          this.debug.log('no job to process')
          this.rest()
          return
        }

        this.running_queue++
        this
          .executeJob(job)
          .catch(err => err)
          .then(() => {
            this.running_queue--
            if (multitasking === false) {
              // when not multitasking only rest after compliting a job
              this.rest(0)
            }
          })

        // parallel execution
        if (multitasking !== false) {
          let msecs
          if (this.running_queue < multitasking_limit) {
            msecs = 0
          }
          this.rest(msecs)
        }
      })
  },
  getJob () {
    return new Promise( (resolve, reject) => {
      this.connection.fetch({
        route: '/:customer/job',
        query: {
          process_next: 1,
          hostname: this.connection.hostnameFn()
        },
        failure: reject,
        success: body => {
          if (Array.isArray(body.jobs) && body.jobs.length > 0) {
            resolve(body.jobs[0])
          } else {
            resolve()
          }
        }
      })
    })
  },
  /**
   * @return {Promise}
   */
  executeJob (jobData) {
    return new Promise((resolve, reject) => {
      const connection = this.connection
      const debug = this.debug
      const options = { connection, app: this.app }

      /**
       *
       * process job jobData
       *
       */
      const job = JobsFactory.create(jobData, options)
      job.getResults((err, result) => {
        if (err) { debug.error('%o', err) }
        const payload = (err || result)
        connection.submitJobResult(job.id, payload, (err, result) => {
          if (err) { debug.error('%o', err) }
          resolve({ payload, result })
        })
      })
    })
  }
})
