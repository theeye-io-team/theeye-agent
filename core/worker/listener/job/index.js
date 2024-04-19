/**
 *
 * job factory
 *
 * @summary parse job data
 *
 */
const WorkersFactory = require('../../index')
const JobFactory = { }

module.exports.create = function (attribs, options) {
  const type = attribs._type
  if (!type) {
    throw new Error('invalid job. no valid type specified')
  }
  if (!JobFactory.hasOwnProperty(type)) {
    throw new Error('invalid job type. not supported')
  }
  return new JobFactory[type](attribs, options)
}

JobFactory.AgentUpdateJob = function(attribs, options){
  const app = options.app

  this.id = attribs.id
  this.attribs = attribs
  this.options = options

  this.getResults = function (done) {
    app.once('config:updated', function (result) {
      done(null, result)
    })
    app.emit('config:outdated')
  }

  return this
}

JobFactory.ScraperJob = function(attribs, options) {
  var connection = options.connection

  this.id = attribs.id;
  this.attribs = attribs
  this.options = options

  this.getResults = function (done) {
    // prepare config
    var config = Object.assign(attribs.task, { type: 'scraper' })
    // invoke worker
    var scraper = WorkersFactory.spawn(options.app, config, connection)
    scraper.getData(function(err,result){
      return done(null,result);
    });
  }

  return this
}

JobFactory.ScriptJob = function (attribs, options) {
  return new ScriptWorker('script', attribs, options)
}

JobFactory.NodejsJob = function (attribs, options) {
  return new ScriptWorker('nodejs', attribs, options)
}

function ScriptWorker (worker_type, attribs, options) {
  const connection = options.connection

  this.id = attribs.id
  this.name = attribs.name
  this.attribs = attribs
  this.options = options

  this.getResults = function (done) {
    // prepare config
    //let event_data = attribs.event_data || {}
    const config = prepareScriptConfig(worker_type, attribs)

    // invoke worker
    const script = WorkersFactory.spawn(options.app, config, connection)
    script.getData(function(err,result){
      return done(null,result);
    })
  }

  return this;
}

const prepareScriptConfig = (type, attribs) => {
  const cfg = {
    type,
    logging: (attribs.agent_logging || false),
    script: {
      id: attribs.script.id,
      filename: attribs.script.filename,
      md5: attribs.script.md5,
      arguments: attribs.task_arguments_values,
      runas: attribs.script_runas,
      timeout: attribs.timeout,
      // IMPORTANT. use empty string for passing empty vars into diff programming languages.
      env: Object.assign({}, attribs.env)
    }
  }

  return cfg
}
