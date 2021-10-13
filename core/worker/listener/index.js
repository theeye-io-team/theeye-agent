
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
   * the steps to be performed on each worker cicle.
   * @param Function next
   * @return null
   */
  keepAlive () {
    try {
      this.debug.log(`Jobs in progress ${this.running_queue}`)
      this.executeJobs()
      this.rest()
    } catch (err) {
      this.debug.error(err)
      return this.rest()
    }
  },
  async executeJobs () {
    const { multitasking_limit, multitasking, task_id } = this.config
    let limit
    if (multitasking === false) {
      limit = (1 - this.running_queue)
    } else {
      limit = (multitasking_limit - this.running_queue)
    }

    if (limit <= 0) { return }

    this.debug.log(`Fetching ${limit} jobs MAX`)
    const jobs = await this.getJobs({ task_id, limit })
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      this.debug.log('no job to process')
      return
    }

    for (let job of jobs) {
      this.running_queue++
      this
        .executeJob(job)
        .catch(err => err)
        .then(() => {
          this.running_queue--
          this.executeJobs()
        })
    }
  },
  getJobs (query) {
    const { task_id = undefined, limit = 1 } = query
    return new Promise( (resolve, reject) => {
      this.connection.fetch({
        route: '/:customer/job',
        query: {
          hostname: this.connection.hostnameFn(),
          limit,
          task_id
        },
        failure: reject,
        success: body => {
          if (Array.isArray(body.jobs) && body.jobs.length > 0) {
            resolve(body.jobs)
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
