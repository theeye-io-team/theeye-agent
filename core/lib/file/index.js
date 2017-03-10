'use strict';

var EventEmitter = require('events').EventEmitter;
var join = require('path').join;
var md5 = require('md5');
var fs = require('fs');
var util = require('util');
var mkdirp = require('mkdirp');

var debug = require('debug')('eye:lib:file');

function noid () {
  return null;
}

var getuid = process.getuid||noid;
var getgid = process.getgid||noid;

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
  if (!mode||typeof mode != 'string') return null;
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
   * @name _basename
   * @type string
   * @private
   */
  var _basename;

  /**
   * @name _dirname
   * @type string
   * @private
   */
  var _dirname;

  /**
   * the full path
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
  _dirname = props.dirname;
  _basename = props.basename;
  // path = dirname + basename
  // https://nodejs.org/api/path.html
  _path = props.path;

  if (!_path) throw new Error('EFILEPATH: path is required');
  if (!_basename) throw new Error('EFILENAME: basename is required');
  if (!_dirname) throw new Error('EFILEDIR: dirname is required');

  // validate mode, uid & gid to avoid entering a loop
  _mode = parseUnixOctalModeString(props.mode)||'0755'; // defaulting to 0755 on posix

  _uid = parseUnixId(props.uid);
  if (_uid === null) _uid = getuid();

  _gid = parseUnixId(props.gid);
  if (_gid === null) _gid = getgid();

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

  Object.defineProperty(this,'basename',{
    get: function() { return _basename; },
    enumerable:true,
  });

  Object.defineProperty(this,'dirname',{
    get: function() { return _dirname; },
    enumerable:true,
  });

  Object.defineProperty(this,'path',{
    get: function() { return _path; },
    enumerable:true,
  });

  this.checkMd5 = function (next) {
    try {
      var buf = fs.readFileSync(this.path);
      var currmd5 = md5(buf);
      debug('checking file md5 "%s" againts "%s"', currmd5, this.md5);
      if (currmd5!=this.md5) {
        var err = new Error('EMD5: file md5 sum mismatch');
        err.code = 'EMD5';
        next(err);
      } else {
        next();
      }
    } catch(e) {
      return next(e);
    }
  }

  this.checkAccess = function (next) {
    debug('checking file access %s', this.path);
    //var accessMode = fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK | fs.constants.F_OK ;
    var accessMode = fs.R_OK | fs.W_OK | fs.X_OK | fs.F_OK ;
    fs.access(this.path, accessMode, (err) => {
      if (err) return next(err);
      return next(null);
    });
  }

  this.checkStats = function (next) {
    var _mode = this.mode;
    var _uid = this.uid;
    var _gid = this.gid;

    fs.stat(this.path, function(err, stat){
      if (err) return next(err);

      /** 
       * @todo
       * if no uid or gid, can change anything. temp Windows fix
       */
      if (_uid===null||_gid===null) {
        return next(null,stat);
      }

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

    // keep by default execution mode
    debug('creating file %s..', this.path);

    function done(err) {
      if (!cbCalled) {
        next(err);
        cbCalled = true;
      }
    }

    var writable = fs.createWriteStream(this.path, { mode:'0755' });
    writable.on('error', done);
    readable.on('error', done);
    readable.pipe(writable).on('finish',function(){
      self.setAccess(done);
    });
  }

  this.setAccess = function (next) {
    var path = this.path;
    var mode = this.mode;
    var uid = this.uid;
    var gid = this.gid;

    if (!mode||isNaN(mode)) mode = parseInt('0755',8);

    debug('setting [mode:%s][uid:%s][gid:%s]',mode,uid,gid);

    fs.chmod(path,mode,function(err){
      if (err) {
        debug(err);
        return next(err);
      }

      debug('mode set');

      // if no uid or no gid , just ignore.
      if (uid===null||gid===null) return next();

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

    if (!fs.existsSync(this.dirname)) {
      mkdirp(this.dirname, function(err){
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
