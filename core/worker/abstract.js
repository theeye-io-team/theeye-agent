
const Logger = require('../lib/logger')
const EventEmitter = require('events').EventEmitter
const Constants = require('../constants')

const MonitorWorker = function (app, connection, config) {
  if (this.constructor === MonitorWorker) {
    throw new Error("Can't instantiate an abstract class!");
  }

  EventEmitter.call(this)

  this.app = app
  this.config = config
  this.name = (config.name || config.type)
  this.connection = connection

  var part = this.config.type + (this.name ? (':' + this.name) : '');
  this.debug = Logger.create(`worker:${part}`)

  this.initialize.apply(this, arguments);
  return this;
}

Object.assign(MonitorWorker.prototype, EventEmitter.prototype, {
  initialize: function() { },
  getId : function() {
    return null ;
  },
  submitWork: function(data,next) {
    this.connection.updateResource(
      this.config.resource_id, data, next
    );
  },
  run () {
    this.enable = true
    this.debug.log('running worker "%s"', this.name)
    this.keepAlive()
  },
  keepAlive: function() {
    var self = this;
    this.debug.log(
      'worker "%s" awake customer "%s"', 
      this.name,
      this.connection.client_customer
    );

    this.getData(function(error,data){
      if (error) {
        self.debug.error('worker execution failed.');
        self.debug.error(error);
        self.submitWork({
          state: Constants.ERROR_STATE,
          event: Constants.WORKERS_ERROR_EVENT,
          data: {
            error: {
              message: error.message,
              code: error.code,
              more: error
            }
          }
        });
        self.debug.log('stopping worker due to errors.');
        self.stop();
      } else {
        //data.monitor_name = self.name ;
        self.submitWork(data);
      }
    });

    this.rest();
  },
  rest (msecs) {
    if (!this.enable) { return }

    let time = (typeof msecs === 'number') ? msecs : this.config.looptime

    this.debug.log('worker "%s" is sleeping for "%d" seconds', this.name, (time/1000))

    this.timeout = setTimeout(() => this.keepAlive(), time)
  },
  getData: function() {
    this.debug.error("Abstract method!");
    throw new Error("Abstract method!");
  },
  setConfig: function(config) {
    this.config = config;
    return this;
  },
  getConfig: function() {
    return this.config;
  },
  stop: function() {
    this.enable = false;
    clearTimeout(this.timeout);
    this.debug.log('worker stopped.');
  }
})

// copied the Backbone extend method
MonitorWorker.extend = function(protoProps, staticProps) {
  var parent = this
  var child

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor
  } else {
    child = function(){ return parent.apply(this, arguments) }
  }

  // Add static properties to the constructor function, if supplied.
  Object.assign(child, parent, staticProps)

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function and add the prototype properties.
  let defineProps = {}
  for (let prop in protoProps) {
    defineProps[prop] = { value: protoProps[prop] }
  }
  child.prototype = Object.create(parent.prototype, defineProps)
  child.prototype.constructor = child

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = parent.prototype

  return child
}

module.exports = MonitorWorker
