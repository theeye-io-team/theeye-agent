/**
 *
 * job factory
 *
 * @summary parse job data
 *
 */
const WorkersFactory = require('../../index')
const JobFactory = { }
const logsConfig = require('config').logs

module.exports.create = function (attribs, options) {
  var type = attribs._type
  if (!type) {
    throw new Error('invalid job. no valid type specified')
  }
  if (!JobFactory.hasOwnProperty(type)) {
    throw new Error('invalid job type. not supported')
  }
  return new JobFactory[type](attribs, options)
}

//
// agent config update job
//
JobFactory.AgentUpdateJob = function(specs, options){
  const app = options.app

  this.id = specs.id
  this.specs = specs
  this.options = options

  this.getResults = function (done) {
    app.once('config:updated', function (result) {
      done(null, result)
    })
    app.emit('config:outdated')
  }

  return this
}

//
// scraper job
//
JobFactory.ScraperJob = function(specs, options) {
  var connection = options.connection

  this.id = specs.id;
  this.specs = specs
  this.options = options

  this.getResults = function (done) {
    // prepare config
    var config = Object.assign(specs.task, { type: 'scraper' })
    // invoke worker
    var scraper = WorkersFactory.spawn(options.app, config, connection)
    scraper.getData(function(err,result){
      return done(null,result);
    });
  }

  return this
}

//
// script job
//
JobFactory.ScriptJob = function (specs, options) {
  var connection = options.connection

  this.id = specs.id
  this.name = specs.name
  this.specs = specs
  this.options = options

  let logging_path = undefined
  if (specs.script.execution_logging_enabled === true) {
    let dirname = (specs.script.execution_logging_dirname || logsConfig.path) 
    let filename = (specs.script_execution_logging_filename || `script_${config.id}_${config.filename}`)
    logging_path = `${dirname}/${filename}_${date.toISOString()}.log`
  }

  this.getResults = function (done) {
    // prepare config
    //let event_data = specs.event_data || {}
    var config = {
      disabled: false,
      type: 'script',
      script: {
        id: specs.script.id,
        filename: specs.script.filename,
        md5: specs.script.md5,
        arguments: specs.task_arguments_values,
        runas: specs.script_runas,
        timeout: specs.timeout,
        // IMPORTANT. use empty string for passing empty vars into diff programming languages.
        env: Object.assign({}, specs.env),
        logging_path
      }
    }

    // invoke worker
    var script = WorkersFactory.spawn(options.app, config, connection)
    script.getData(function(err,result){
      return done(null,result);
    })
  }

  return this;
}

/**
 *
 * Integration Jobs
 *
 */
//JobFactory.NgrokIntegrationJob = require('./integrations/ngrok')
