'use strict';

var EventEmitter = require('events').EventEmitter;
var join = require('path').join;
var md5 = require('md5');
var fs = require('fs');
var util = require('util');
var mkdirp = require('mkdirp');

var FILE_MISSING = 'file_missing';
var FILE_OUTDATED = 'file_outdated';
var debug = require('debug')('eye:lib:file');

function File (props) {

  EventEmitter.call(this);

  var _id = props.id;
  var _md5 = props.md5;
  var _filename = props.filename;
  var _path = props.path;
  var _mode = props.mode;
  var _owner = props.owner;
  var _group = props.group;

  if (!_path) throw new Error('path is required.');
  if (!_filename) throw new Error('filename is required.');
  var _filepath = join(_path,_filename);

  Object.defineProperty(this,'id',{
    get: function() { return _id; },
    enumerable:true,
  });
  Object.defineProperty(this,'md5',{
    get: function() { return _md5; },
    enumerable:true,
  });
  Object.defineProperty(this,'filepath',{
    get: function() { return _filepath; },
    enumerable:true,
  });
  Object.defineProperty(this,'filename',{
    get: function() { return _filename; },
    enumerable:true,
  });
  Object.defineProperty(this,'path',{
    get: function() { return _path; },
    enumerable:true,
  });

  this.checkFile = function (done) {
    debug('checking %s', this.filepath);
    if (!fs.existsSync(this.filepath)) {
      return done(false, FILE_MISSING);
    } else {
      var buf = fs.readFileSync(this.filepath);
      var currmd5 = md5(buf);
      debug('file is present. checking md5 current : %s / %s',currmd5,this.md5);
      if (currmd5!=this.md5) {
        return done(false, FILE_OUTDATED);
      } else {
        return done(true);
      }
    }
  }

  this.createFile = function (stream, done) {
    // filepath is path + filename
    // keep by default execution mode
    var writable = fs.createWriteStream(this.filepath, { mode:'0755' });
    stream
      .on('error',function(error){
        if (done) done(error);
      })
      .pipe( writable )
      .on('finish',function(){
        if (done) done();
      });
  }

  this.save = function (stream, done) {
    var self = this;
    // path is without filename on it
    if (!fs.existsSync(this.path)) {
      mkdirp(this.path, function(err){
        if (err) return done(err);
        else self.createFile(stream,done);
      });
    } else {
      self.createFile(stream,done);
    }
    return this;
  }
}

util.inherits(File, EventEmitter);

module.exports = File;
