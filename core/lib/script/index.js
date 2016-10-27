"use strict";

var fs = require('fs');
var md5 = require('md5');
var exec = require('child_process').exec;
var join = require('path').join;
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('eye:lib:script');
//var shellscape = require('shell-escape');

var FILE_MISSING = 'file_missing';
var FILE_OUTDATED = 'file_outdated';

var platform = require('os').platform();

var ScriptOutput = require('./output');

var util = require('util');

function Script(props){

  EventEmitter.call(this);

  var _id = props.id ;
  var _md5 = props.md5 ;
  var _args = props.args ;
  var _filename = props.filename ;
  var _path = props.path ;
  var _runas = props.runas ;

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

    var args;
    if( this.args && Array.isArray(this.args) ){
      if(platform=='linux'){
        //args = shellscape( this.args );
        args = this.args.join(' ');
      } else if( /win/.test(platform) ) {
        args = ( this.args.map(function(arg){ return '"' + arg + '"'; }) ).join(' ');
      }
    } else {
      args = '';
    }

    var partial = this.filepath + ' ' + args ;
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

  this.execScript = function(script){
    var self = this;
    var child = exec(script);
    var partials = { stdout:'', stderr:'', log:'' };

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

    child.on('close',function(code){
      _output = new ScriptOutput({
        code: code,
        stdout: partials.stdout,
        stderr: partials.stderr,
        log: partials.log
      });

      self.emit('end', _output);
    });

    return self;
  }
}

util.inherits(Script, EventEmitter);


module.exports = Script;
