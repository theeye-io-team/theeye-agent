
const debug = require('debug')
const EventEmitter = require('events').EventEmitter
const Constants = require('../constants')

const MonitorWorker = function (connection,config) {
  if (this.constructor === MonitorWorker) {
    throw new Error("Can't instantiate an abstract class!");
  }

  EventEmitter.call(this);

  this.config = config;
  this.name = (config.name||config.type);
  this.connection = connection;
  this.enable = true;

  var part = this.config.type + (this.name ? (':' + this.name) : '');
  var log = 'eye:agent:worker:' + part;
  this.debug = {
    'log': debug(log),
    'error': debug(log + ':error')
  }

  this.initialize.apply(this, arguments);
  return this;
}

Object.assign(MonitorWorker.prototype, EventEmitter.prototype, {
  initialize: function() { },
  getId : function() {
    return null ;
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
  submitWork: function(data,next) {
    this.connection.updateResource(
      this.config.resource_id, data, next
    );
  },
  run: function() {
    this.debug.log('running worker "%s"', this.name);
    this.keepAlive();
  },
  getData: function() {
    this.debug.error("Abstract method!");
    throw new Error("Abstract method!");
  },
  rest: function (msecs) {
    if (!this.enable) {
      return
    }

    let time = msecs || this.config.looptime

    this.debug.log(
      'worker "%s" will sleep "%d" seconds', 
      this.name,
      (time / 1000)
    )

    this.timeout = setTimeout(() => {
      return this.keepAlive()
    }, time)
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
