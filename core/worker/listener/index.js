
const AbstractWorker = require('../abstract')
const JobsFactory = require('./job')

/**
 *
 * this listen to orders and also send keep alive to the supervisor
 *
 */
module.exports = AbstractWorker.extend({
  initialize () {
    // Set the default configuration
    const ListenerConfig = (this.app.config.workers?.listener || { multitasking_limit: 1 })
    if (!this.config.multitasking_limit) {
      this.config.multitasking_limit = (ListenerConfig.multitasking_limit || 1)
    }

    this.runningCount = 0
  },
  jobs: {},
  type: 'listener',
  /**
   * often the resource id is required.
   * in this case the associated host resource id
   * @param Function (optional) next
   * @return String resource id
   */
  getId (next) {
    return this.config.resource_id
  },
  /**
   * obteins the data that will be sent to the supervisor
   * @param Function next
   * @return null
   */
  getData (next) {
    return next(null, {
      state: 'success',
      data: { message: 'agent running' }
    })
  },
  /**
   * the steps to be performed on each worker cicle.
   * @param Function next
   * @return null
   */
  keepAlive () {
    try {
      this.debug.log(`Jobs in progress ${this.runningCount}`)
      this.executeJobs()
    } catch (err) {
      this.debug.error(err)
    }

    this.rest()
  },
  async executeJobs () {
    const limit = this.jobsQueryLimit()
    if (limit <= 0) { return }

    let jobs
    if (!this.config.task_id) {
      jobs = await this.getJobs()
    } else {
      jobs = await this.getJobsByTask({ limit })
    }

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      this.debug.log('no job to process')
      return
    }

    this.debug.log(`${jobs.length} jobs`)
    for (const job of jobs) {
      this.debug.log(`Processing job ${job.id}:${job.name}`)
      if (!job || !job.id) {
        this.debug.error('Invalid job received')
        return
      } else {
        this.jobExecutionLoop(job)
      }
    }
  },
  /**
   * @return {Promise}
   */
  async jobExecutionLoop (jobData) {
    const debug = this.debug
    this.runningCount++

    let result
    let job
    try {
      job = JobsFactory.create(jobData, this)

      result = await this.getJobOutput(job)
    } catch (err) {
      debug.error(`Error executing job ${jobData.id}: ${jobData.name}`)
      debug.error(err)
      result = { state: 'error', err, data: { output: err } }
    }

    await this.submitJobResult(job, result)

    this.runningCount--
    this.executeJobs() // continue recursion
  },
  /**
   * old endpoint
   */
  getJobs () {
    return new Promise((resolve, reject) => {
      this.connection.fetch({
        route: '/:customer/job',
        query: {
          hostname: this.connection.hostnameFn()
        },
        failure: reject,
        success: body => {
          if (Array.isArray(body.jobs)) {
            resolve(body.jobs)
          } else {
            resolve()
          }
        }
      })
    })
  },
  getJobsByTask ({ limit }) {
    return new Promise((resolve, reject) => {
      this.debug.log(`Fetching ${limit} jobs`)

      const taskId = this.config.task_id
      const url = `/task/${taskId}/job/queue`
      const query = {
        hostname: this.connection.hostnameFn(),
        limit
      }

      this.connection.fetch({
        route: url,
        query,
        failure: reject,
        success: jobs => {
          if (Array.isArray(jobs)) {
            resolve(jobs)
          } else {
            resolve()
          }
        }
      })
    })
  },
  jobsQueryLimit () {
    const { multitasking_limit = 1, multitasking = false } = this.config
    if (multitasking === false) {
      return (1 - this.runningCount)
    } else {
      return (multitasking_limit - this.runningCount)
    }
  },
  /**
   * @return {Promise}
   */
  getJobOutput (job) {
    this.debug.log(`obtaining job output ${job.id}:${job.name}`)

    return new Promise((resolve, reject) => {
      job.getResults((err, result) => {
        if (err) {
          this.debug.error('%o', err)
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  },
  /**
   * @return {Promise}
   */
  submitJobResult (job, payload) {
    this.debug.log(`submiting job ${job.id}:${job.name}`)

    return new Promise((resolve, reject) => {
      this.connection.submitJobResult(job.id, payload, (err, result) => {
        if (err) {
          this.debug.error('%o', err)
        }
        resolve({ payload, result })
      })
    })
  }
})
