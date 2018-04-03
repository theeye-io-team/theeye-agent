/**
 *
 * job factory
 *
 * @summary parse job data
 *
 */
var WorkersFactory = require('../../index')
var assign = require('lodash/assign');

var JobFactory = { }

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
  var listener = options.listener

  this.id = specs.id
  this.specs = specs
  this.options = options

  function process (done) {
    listener.once('config:updated', function (result) {
      done(null, result)
    })
    listener.emit('config:outdated')
  }

  this.getResults = function (next) { process(next) }

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

  function process (done) {
    // prepare config
    var config = assign({}, specs.task, { type: 'scraper' });
    // invoke worker
    var scraper = WorkersFactory.spawn(config, connection)
    scraper.getData(function(err,result){
      return done(null,result);
    });
  }

  this.getResults = function (next) { process(next) }

  return this
}

//
// script job
//
JobFactory.ScriptJob = function(specs, options) {
  var connection = options.connection

  this.id = specs.id
  this.specs = specs
  this.options = options

  function process (done) {
    // prepare config
    let event_data = specs.event_data || {}
    var config = {
      disabled: false,
      type: 'script',
      script: {
        id: specs.script.id,
        filename: specs.script.filename,
        md5: specs.script.md5,
        arguments: specs.script_arguments,
        runas: specs.script_runas,
        env: {
          // IMPORTANTE. use empty string for passing vars into diff languages.
          THEEYE_WF: specs.event || '', // is workflow ?
          THEEYE_WF_LASTLINE: event_data.lastline || '',
          THEEYE_WF_OUTPUT: event_data.output || ''
        }
      }
    };
    // invoke worker
    var script = WorkersFactory.spawn(config, connection)
    script.getData(function(err,result){
      return done(null,result);
    });
  }

  this.getResults = function (next) { process(next) }

  return this;
}

/**
 *
 * Integration Jobs
 *
 */
JobFactory.NgrokIntegrationJob = require('./integrations/ngrok')
