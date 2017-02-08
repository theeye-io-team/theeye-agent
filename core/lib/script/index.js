"use strict";

var util = require('util');
var exec = require('child_process').exec;
var platform = require('os').platform();
var debug = require('debug')('eye:lib:script');
var config = require('config');
var kill = require('tree-kill');

var DEFAULT_EXECUTION_TIMEOUT = 10*60*1000;

var File = require('../file');
var ScriptOutput = require('./output');

function Script (props) {

  File.apply(this,arguments);

  this.prepareArguments = function(args){
    var parsed;
    if( args && Array.isArray(args) ){
      // escape spaces both for linux and windows
      parsed = args.map(function(arg){
        return ( /\s/.test(arg) ) ? ('"' + arg + '"') : arg ; 
      }).join(' ');
    } else {
      parsed = '';
    }
    return parsed;
  }

  var _runas = props.runas;
  var _args = this.prepareArguments(props.args);
  var _output = null;

  Object.defineProperty(this,"args",{
    get: function() { return _args; },
    set: function(args) {
      _args = this.prepareArguments(args);
      return this;
    },
    enumerable:true,
  });
  Object.defineProperty(this,"runas",{
    get: function() { return _runas; },
    enumerable:true,
  });
  Object.defineProperty(this,"output",{
    get: function() { return _output; },
    enumerable:true,
  });

  this.run = function(end){
    var partial = this.path + ' ' + this.args ;
    var formatted;

    var runas = this.runas;
    var regex = /%script%/;

    if (runas && regex.test(runas) === true) {
      formatted = runas.replace(regex, partial);
    } else {
      formatted = partial;
    }

    this.once('end',end);

    return this.execScript(formatted);
  }

  this.execScript = function(script,options){
    debug('running script "%s"', script);

    options||(options={});
    if (!options.timeout) {
      var timeout = (config.scripts&&config.scripts.execution_timeout)||undefined;
      options.timeout = timeout||DEFAULT_EXECUTION_TIMEOUT;
    }

    var self = this,
      killed = false,
      child = exec(script),
      partials = {stdout:'',stderr:'',log:''},
      exec_timeout = parseInt(options.timeout),
      exec_start = process.hrtime();

    var timeout = setTimeout(function(){
      debug('killing child script ("%s")', script);
      killed = true;
      kill(child.pid,'SIGKILL',function(err){
        if (err) debug(err);
        else debug('kill send');
      });
    },exec_timeout);

    this.once('end',function(){
      clearTimeout(timeout);
    });

    child.stdout.on('data',function(data){
      partials.stdout += data;
      partials.log += data;
      self.emit('stdout', data);
    });

    child.stderr.on('data',function(data){
      partials.stderr += data;
      partials.log += data;
      self.emit('stderr', data);
    });

    child.on('close',function (code,signal) {
      debug('child emit close with %j',arguments);

      var exec_diff = process.hrtime(exec_start);
      debug('times %j.',exec_diff);

      if (exec_diff[0]===0){
        debug('script end after %s msecs.',exec_diff[1]/1e6);
      } else {
        debug('script end after %s secs',exec_diff[0]);
      }

      _output = new ScriptOutput({
        code: code,
        stdout: partials.stdout,
        stderr: partials.stderr,
        log: partials.log
      });

      self.emit('end',util._extend(
        _output.toObject(),{
          signal: signal,
          killed: Boolean(killed),
          times: {
            seconds: exec_diff[0],
            nanoseconds: exec_diff[1],
          }
        }
      ));
    });

    child.on('error',function(err){
      debug('child emit error with %j',err);
    });

    child.on('disconnect',function(){
      debug('script emit disconnect');
    });

    child.on('message',function(){
      debug('child emit message with %j',arguments);
    });

    return self;
  }
}

util.inherits(Script, File);

module.exports = Script;
