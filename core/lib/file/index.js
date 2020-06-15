
const EventEmitter = require('events').EventEmitter
const join = require('path').join
const fs = require('fs')
const crypto = require('crypto')
const util = require('util')
const mkdirp = require('mkdirp')
const debug = require('debug')('eye:lib:file')

function noid () {
  return null
}

let getuid = (process.getuid||noid)
let getgid = (process.getgid||noid)

/**
 * convert the returned stat.mode to the unix octal form
 * @return string
 */
function statModeToOctalString (mode) {
  var permString = '0' + (mode & parseInt('0777',8)).toString(8)
  return permString
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
  var num = parseInt(mode.substr(1,mode.length));
  if (num > 777 || num <= 0) return null;
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
  EventEmitter.call(this)

  /**
   * @name _id
   * @type string
   * @private
   */
  var _id

  /**
   * @name _md5
   * @type string
   * @private
   */
  var _md5

  /**
   * @name _basename
   * @type string
   * @private
   */
  var _basename

  /**
   * @name _dirname
   * @type string
   * @private
   */
  var _dirname

  /**
   * the full path
   * @name _path
   * @type string
   * @private
   */
  var _path

  /**
   * @name _mode
   * @type string permissions in Unix octal format
   * @private
   */
  var _mode

  /**
   * @name _uid
   * @type integer unsigned integer
   * @private
   */
  var _uid

  /**
   * @name _gid
   * @type integer unsigned integer
   * @private
   */
  var _gid

  _id = props.id
  _md5 = props.md5
  _dirname = props.dirname
  _basename = props.basename
  // path = dirname + basename
  // https://nodejs.org/api/path.html
  _path = props.path

  if (!_path) throw new Error('EPATH: path is required');
  if (!_basename) throw new Error('EBASE: basename is required');
  if (!_dirname) throw new Error('EDIR: dirname is required');

  // validate mode, uid & gid to avoid entering a loop
  _mode = parseUnixOctalModeString(props.mode);

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
    md5(this.path)
      .then(currmd5 => {
        debug('checking file md5 "%s" againts "%s"', currmd5, this.md5)
        if (currmd5 !== this.md5) {
          var err = new Error('EMD5: file checksum mismatch')
          err.code = 'EMD5'
          next(err)
        } else {
          next()
        }
      }).catch(next)
  }

  this.checkAccess = function (next) {
    debug('checking file access %s', this.path);
    //var accessMode = fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK | fs.constants.F_OK ;
    var accessMode = fs.R_OK | fs.W_OK | fs.X_OK | fs.F_OK ;
    fs.access(this.path, accessMode, function(err){
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

      if (_mode!==null) {
        var permString = statModeToOctalString(stat.mode);
        if (permString !== _mode) {
          var err = new Error('EMODE: file mode does not match');
          err.code = 'EMODE';
          return next(err,stat);
        }
      }

      if (_uid!==null) {
        if (stat.uid !== _uid) {
          var err = new Error('EOWNER: file uid does not match');
          err.code = 'EOWNER';
          return next(err,stat);
        }
      }

      if (_gid!==null) {
        if (stat.gid !== _gid) {
          var err = new Error('EGROUP: file gid does not match');
          err.code = 'EGROUP';
          return next(err,stat);
        }
      }

      next(null,stat);
    });
  }

  this.setAccess = function (done) {
    const self = this
    self.setMode(function(err){
      if (err) return done(err)
      self.setOwner(function(err){
        return done(err)
      })
    })
  }

  this.setOwner = function (callback) {
    var path = this.path;
    var uid = this.uid;
    var gid = this.gid;

    function chown (next) {
      // if no uid or no gid , just ignore. node needs both to work
      if (uid===null||gid===null) return next()

      debug('setting owner uid: %s, gid: %s', uid, gid)
      fs.chown(path, uid, gid, function (err) {
        if (err) {
          debug(err)
          return next(err)
        }
        debug('owner set')
        return next()
      })
    }

    chown(function(err){ callback(err) })
  }

  this.setMode = function (callback) {
    var path = this.path;
    var mode = this.mode;

    function chmod (next) {
      if (!mode||isNaN(mode)) return next()
      debug('setting mode %s', mode)
      fs.chmod(path, mode, function (err) {
        if (err) {
          debug(err)
          return next(err)
        }
        debug('mode set')
        next()
      })
    }

    chmod(function(err){ callback(err) })
  }

  this.save = function (stream, next) {
    var self = this

    if (!fs.existsSync(this.dirname)) {
      mkdirp(this.dirname, function (err) {
        if (err) { return next(err) }
        createFile(stream, next)
      })
    } else {
      createFile(stream, next)
    }
    return this
  }

  // private method
  const createFile = (function(readable, next){
    const self = this
    let cbCalled = false

    // keep by default execution mode
    debug('creating file %s..', this.path);

    var writable = fs.createWriteStream(this.path, { mode:'0755', encoding: 'utf8' })

    function done (err) {
      if (!cbCalled) {
        readable.destroy()
        writable.end()
        next(err)
        cbCalled = true
      }
    }

    writable.on('error', done)
    readable.on('error', done)
    readable
      .pipe(writable)
      .on('finish',function(){
        md5(this.path)
          .then(checksum => {
            _md5 = checksum
            self.setAccess(done)
          })
          .catch(done)
      })
  }).bind(this)
}

const md5 = (path, next) => {
  return new Promise( (resolve, reject) => {
    let hash = crypto.createHash('md5')
    let stream = fs.createReadStream(path)

    stream.on('data', function (data) {
      hash.update(data, 'utf8')
    })

    stream.on('end', function () {
      let checksum = hash.digest('hex')
      resolve(checksum)
    })

    stream.on('error', reject)
  })
}

util.inherits(File, EventEmitter)

module.exports = File;
