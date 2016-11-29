'use strict';

var util = require('util');
var debug = require('debug');
var AGENT_FAILURE_STATE = 'agent_failure';
var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;



var AbstractWorker = module.exports = function (connection,config) {
  if (this.constructor===AbstractWorker) {
    throw new Error("Can't instantiate an abstract class!");
  }

  EventEmitter.call(this);

  this.config = config;
  this.name = config.name||config.type;
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

_.extend(AbstractWorker.prototype, EventEmitter.prototype, {
	initialize: function() { },
	getId : function() {
		return null ;
	},
	keepAlive : function() {
		var self = this;
		this.debug.log(
			'worker "%s" awake customer "%s"', 
			this.name,
			this.connection.client_customer
		);

		this.getData(function(error,data){
			if( error ){
				self.debug.error('worker execution failed.');
				self.debug.error(error);
				self.submitWork({
					state: AGENT_FAILURE_STATE,
					data: { error:error }
				});
				self.debug.log('stopping worker due to errors.');
				self.stop();
			} else {
				data.monitor_name = self.name ;
				self.submitWork(data);
			}
		});

		this.sleep();
	},
	submitWork : function(data,next) {
		this.connection.updateResource(
			this.config.resource_id, data, next
		);
	},
	run : function() {
		this.debug.log('running worker "%s"', this.name);
		this.keepAlive();
	},
	getData : function() {
		this.debug.error("Abstract method!");
		throw new Error("Abstract method!");
	},
	sleep : function() {
		if(!this.enable) return;

		this.debug.log(
			'worker "%s" slept for "%d" seconds', 
			this.name,
			this.config.looptime/1000
		);

		var self = this;
		this.timeout = setTimeout(
			function(){
				return self.keepAlive();
			},
			this.config.looptime
		);
	},
	setConfig : function(config) {
		this.config = config;
		return this;
	},
	getConfig : function() {
		return this.config;
	},
	stop : function() {
		this.enable = false;
		clearTimeout(this.timeout);
		this.debug.log('worker stopped.');
	},
	downloadScript: function(script,done){
		var self = this;
		this.debug.log('getting script %s', script.id);
		var stream = this.connection.scriptDownloadStream(script.id);

		this.debug.log('download stream');
		script.save(stream,function(error){
			if(error){
				self.debug.error(error);
				return done(error);
			}
			self.debug.log('script downloaded');
			done();
		});
	},
	checkScript: function(script,next){
		var self = this;
		script.checkFile(function(success){
			if(!success){ // not present or outdated
				self.debug.log('script need to be downloaded');
				self.downloadScript(script, next);
			} else {
				self.debug.log('script is ok');
				next();
			}
		});
	}
});

// copied the Backbone extend method
AbstractWorker.extend = function(protoProps, staticProps) {
	var parent = this;
	var child;

	// The constructor function for the new subclass is either defined by you
	// (the "constructor" property in your `extend` definition), or defaulted
	// by us to simply call the parent constructor.
	if (protoProps && _.has(protoProps, 'constructor')) {
		child = protoProps.constructor;
	} else {
		child = function(){ return parent.apply(this, arguments); };
	}

	// Add static properties to the constructor function, if supplied.
	_.extend(child, parent, staticProps);

	// Set the prototype chain to inherit from `parent`, without calling
	// `parent`'s constructor function and add the prototype properties.
	child.prototype = _.create(parent.prototype, protoProps);
	child.prototype.constructor = child;

	// Set a convenience property in case the parent's prototype is needed
	// later.
	child.__super__ = parent.prototype;

	return child;
};
