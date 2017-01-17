"use strict";

var EventEmitter = require('events').EventEmitter;
var join = require('path').join;
var md5 = require('md5');
var fs = require('fs');
var util = require('util');

var FILE_MISSING = 'file_missing';
var FILE_OUTDATED = 'file_outdated';

function File (props) {

  EventEmitter.call(this);

  var _id = props.id;
  var _md5 = props.md5;
  var _filename = props.filename;
  var _path = props.path;

  if (!_path) throw new Error('path is required.');
  if (!_filename) throw new Error('filename is required.');
  var _filepath = join(_path,_filename);

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
  Object.defineProperty(this,"path",{
    get: function() { return _path; },
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

}

util.inherits(File, EventEmitter);

module.exports = File;
