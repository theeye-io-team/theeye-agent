'use strict';

var EventEmitter = require('events').EventEmitter;
var join = require('path').join;
var md5 = require('md5');
var fs = require('fs');
var util = require('util');
var mkdirp = require('mkdirp');
//var uidNumber = require('uid-number');

var debug = require('debug')('eye:lib:file');

/**
 * convert the returned stat.mode to the unix octal form
 * @return string
 */
function statModeToOctalString (mode) {
  var permString = '0' + (mode & parseInt('0777',8)).toString(8);
  return permString;
}

/**
 * given a mode string validate and returns it, or null if invalid
 * @param {string} mode
 * @return {string|null}
 */
function parseUnixOctalModeString (mode) {
  if (mode.length != 4) return null;
  if (['0','1','2','4'].indexOf(mode[0]) === -1) return null;
  if (parseInt(mode.substr(1,mode.length)) > 777) return null;
  return mode;
}

/**
 *
 * convert argument to unix id
 *
 * @author Facugon
 * @param Mixed id
 * @return {Integer|null}
 * @private
 *
 */
function parseUnixId (id) {
  var _id = parseInt(id);
  if (!Number.isInteger(_id) || id < 0) return null;
  return _id;
}

function File (props) {

  EventEmitter.call(this);

  /**
   * @name _id
   * @type string
   * @private
   */
  var _id;
  /**
   * @name _md5
   * @type string
   * @private
   */
  var _md5;
  /**
   * @name _filename
   * @type string
   * @private
   */
  var _filename;
  /**
   * @name _path
   * @type string
   * @private
   */
  var _path;
  /**
   * @name _mode
   * @type string string of permissions in the unix octal format
   * @private
   */
  var _mode;
  /**
   * @name _uid
   * @type integer unsigned integer
   * @private
   */
  var _uid;
  /**
   * @name _gid
   * @type integer unsigned integer
   * @private
   */
  var _gid;

  _id = props.id;
  _md5 = props.md5;
  _filename = props.filename;
  _path = props.path;

  // validate mode, uid & gid to avoid entering a loop
  _mode = parseUnixOctalModeString(props.mode)||'0755'; // assuming this is a correct value
  _uid = parseUnixId(props.uid)||process.getuid();
  _gid = parseUnixId(props.gid)||process.getgid();

  if (!_path) throw new Error('path is required.');
  if (!_filename) throw new Error('filename is required.');
  var _filepath = join(_path,_filename);

  Object.defineProperty(this,'id',{
    get: function() { return _id; },
    enumerable:true,
  });

  Object.defineProperty(this,'gid',{
    get: function() { return _gid; },
    enumerable:true,
  });

  Object.defineProperty(this,'uid',{
    get: function() { return _uid; },
    enumerable:true,
  });

  Object.defineProperty(this,'mode',{
    get: function() { return _mode; },
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

  this.access = function (next) {
    debug('checking file access %s', this.filepath);

    var accessMode = fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK | fs.constants.F_OK ;

    fs.access(this.filepath, accessMode, (err) => {
      if (err) return next(err);
      var buf = fs.readFileSync(this.filepath);
      var currmd5 = md5(buf);
      debug('checking file md5 "%s" againts "%s"', currmd5, this.md5);
      if (currmd5!=this.md5) {
        return next(false, FILE_OUTDATED);
      } else {
        return next(true);
      }
    });
  }

  this.stats = function (next) {
    var _mode = this.mode,
      _uid = this.uid,
      _gid = this.gid ;

    fs.stat(this.filepath, function(err, stat){
      if (err) return next(err);

      var permString = statModeToOctalString(stat.mode);
      if (permString !== _mode) {
        var err = new Error('EMODE: current file mode is incorrect');
        err.code = 'EMODE';
        return next(err);
      }

      if (stat.uid !== _uid) {
        var err = new Error('EOWNER: current file uid is incorrect');
        err.code = 'EOWNER';
        return next(err);
      }

      if (stat.gid !== _gid) {
        var err = new Error('EGROUP: current file gid is incorrect');
        err.code = 'EGROUP';
        return next(err);
      }

      next(null,stat);
    });
  }

  this.createFile = function (readable, next) {
    var self = this,
      cbCalled = false;

    // filepath is path + filename
    // keep by default execution mode
    debug('creating file %s..', this.filepath);

    function done(err) {
      if (!cbCalled) {
        next(err);
        cbCalled = true;
      }
    }

    var writable = fs.createWriteStream(this.filepath, { mode:'0755' });
    writable.on('error', done);
    readable.on('error', done);
    readable.pipe(writable).on('finish',function(){
      self.setAccess(done);
    });
  }

  this.setAccess = function (next) {
    var path = this.filepath,
      mode = this.mode,
      uid = this.uid,
      gid = this.gid;

    debug('setting [mode:%s][uid:%s][gid:%s]',mode,uid,gid);

    if (!mode||isNaN(mode)) mode = parseInt('0755',8);

    fs.chmod(path,mode,function(err){
      if (err) {
        debug(err);
        return next(err);
      }

      debug('mode set');

      fs.chown(path,uid,gid,function(err){
        if (err) {
          debug(err);
          return next(err);
        }
        debug('permissions set');
        return next();
      });
    });
  }

  this.save = function (stream, next) {
    var self = this;
    // path is without filename on it
    if (!fs.existsSync(this.path)) {
      mkdirp(this.path, function(err){
        if (err) return next(err);
        else self.createFile(stream,next);
      });
    } else {
      self.createFile(stream,next);
    }
    return this;
  }
}

util.inherits(File, EventEmitter);

module.exports = File;
