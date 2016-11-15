"use strict";

var util = require('util');
var fs = require('fs');
var md5 = require('md5');
var exec = require('child_process').exec;
var join = require('path').join;
var EventEmitter = require('events').EventEmitter;
var platform = require('os').platform();
var debug = require('debug')('eye:lib:script');
var config = require('config');
//var shellscape = require('shell-escape');
var kill = require('tree-kill');

var FILE_MISSING = 'file_missing';
var FILE_OUTDATED = 'file_outdated';
var DEFAULT_EXECUTION_TIMEOUT = 10*60*1000;

var ScriptOutput = require('./output');


function Script(props){

  EventEmitter.call(this);

  this.prepareArguments = function(args){
    var parsed;
    if( args && Array.isArray(args) ){

      /**
       * @author facugon
       * this was a test
       *
      if(platform=='linux'){
        //args = shellscape( this.args );

        parsed = args.join(' '); // no shell scape, yet. anything allowed

      } else if( /win/.test(platform) ) {

        parsed = ( args.map(function(arg){ return '"' + arg + '"'; }) ).join(' ');
      }
      */

      // escape spaces both for linux and windows
      parsed = args.map(function(arg){
        return ( /\s/.test(arg) ) ? ('"' + arg + '"') : arg ; 
      }).join(' ');

    } else {
      parsed = '';
    }
    return parsed;
  }

  var _id = props.id ;
  var _md5 = props.md5 ;
  var _filename = props.filename ;
  var _path = props.path ;
  var _runas = props.runas ;
  var _args = this.prepareArguments(props.args);

  if( ! props.path ) throw new Error('scripts path is required.');
  var _filepath = join(_path,_filename);
  var _output = null;

  Object.defineProperty(this,"id",{
    get: function() { return _id; },
    enumerable:true,
  });
  Object.defineProperty(this,"md5",{
    get: function() { return _md5; },
    enumerable:true,
  });
  Object.defineProperty(this,"filepath",{
    get: function() { return _filepath; },
    enumerable:true,
  });
  Object.defineProperty(this,"filename",{
    get: function() { return _filename; },
    enumerable:true,
  });
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
  Object.defineProperty(this,"path",{
    get: function() { return _path; },
    enumerable:true,
  });
  Object.defineProperty(this,"output",{
    get: function() { return _output; },
    enumerable:true,
  });

  this.checkFile = function(done){
    var self = this;
    fs.exists(this.filepath,function(exists){
      if(!exists) return done(false, FILE_MISSING);
      else {
        var buf = fs.readFileSync(self.filepath);
        if( md5(buf) != self.md5 ){
          return done(false, FILE_OUTDATED);
        } else {
          return done(true);
        }
      }
    });
  }

  this.save = function(stream, done){
    var writable = fs.createWriteStream(this.filepath, { mode:'0755' });

    stream.on('error',function(error){
      if(done) done(error);
    })
    .pipe( writable )
    .on('finish',function(){
      if(done) done();
    });

    return this;
  }

  this.run = function(end){

    var partial = this.filepath + ' ' + this.args ;
    var formatted;

    var runas = this.runas;
    var regex = /%script%/;

    if( runas && regex.test(runas) === true ){
      formatted = runas.replace(regex, partial);
    } else {
      formatted = partial;
    }

    this.once('end',end);

    return this.execScript(formatted);
  }

  this.execScript = function(script,options){
    options||(options={});
    if (!options.timeout) {
      var timeout = (config.scripts&&config.scripts.execution_timeout)||undefined;
      options.timeout = timeout||DEFAULT_EXECUTION_TIMEOUT;
    }

    var self = this;
    var child = exec(script);
    var partials = {stdout:'',stderr:'',log:''};

    var exec_timeout = parseInt(options.timeout);
    var exec_start = process.hrtime();

    var timeout = setTimeout(function(){
      debug('killing child script ("%s")', script);
      kill(child.pid,'SIGKILL',function(err){
        if (err) debug(err);
        else debug('kill send');
      });
    },exec_timeout);

    this.once('end',function(){
      clearTimeout(timeout);
    });

    debug('running script "%s"', script);

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

    child.on('close',function(code,signal){
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
          signal:signal,
          times:{
            seconds:exec_diff[0],
            nanoseconds:exec_diff[1],
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

util.inherits(Script, EventEmitter);

module.exports = Script;
