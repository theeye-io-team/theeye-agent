'use strict';
var ChildProcess = require('child_process');
var yawn = require('yawn')
  , EE  = require('events').EventEmitter
  , inherits = require('util').inherits
  , xtend = require('xtend')
var path = require('path');
var winBinPath = path.join( __dirname , '/winBinary/');

/**
 * Parses out process info from a given `ps aux` line.
 *
 * @name parseLine
 * @private
 * @function
 * @param {string} line the raw info for the given process
 * @return {Object} with parsed out process info
 */
function parseLine(line) {
  // except for the command, no field has a space, so we split by that and piece the command back together
  var parts = line.split(/ +/);
  return {
      user    : parts[0]
    , pid     : parseInt(parts[1])
    , '%cpu'  : parseFloat(parts[2])
    , '%mem'  : parseFloat(parts[3])
    , vsz     : parseInt(parts[4])
    , rss     : parseInt(parts[5])
    , tty     : parts[6]
    , state   : parts[7]
    , started : parts[8]
    , time    : parts[9]
    , command : parts.slice(10).join(' ')
  }
}

/**
 * Creates a `psaux` object.
 * 
 * @name Psaux
 */
function Psaux() {
  if (!(this instanceof Psaux)) return new Psaux();
  this._intervalToken = undefined;
}

module.exports = Psaux;
inherits(Psaux, EE);

var proto = Psaux.prototype;

/**
 * Obtains raw process information
 * 
 * @name psaux::obtain
 * @function
 * @param {function} cb called back with an array of strings each containing information of a running process
 */
proto.obtain =  function obtain(callback) {
  var command='ps';var args='aux';
  if (process.platform == "win32"){
	  command='"'+winBinPath+'psaux.exe"';
//	  command=command.replace(/\\/g,"/");
//	  command=command.replace(/C:/,"/C");
	  args='';
	  console.log("TEMPORAL TEST JAVI "+command);
  }
 
  ChildProcess.exec( command + args, function( err, stdout, stderr) {
      if (err || stderr) {
          return callback( err || stderr.toString() );
      }
      else {
          stdout = stdout.toString().split('\n').slice(1, -1);
;
          callback(null, stdout || false);
      }
  });

}

/**
 * Parses the given lines of process information
 * Exposed solely for testing
 * 
 * @private
 * @name psaux::parseLines
 * @function
 * @param {Array.<string>} lines each containing information of one process
 * @return {Array.<Object>} parsed lines
 */
proto.parseLines = function parseLines(lines) {
  return lines.map(parseLine);
}

/**
 * Obtains process information and parses it.
 *
 * ### VSZ
 *
 * VSZ is the Virtual Memory Size. It includes all memory that the process can
 * access, including memory that is swapped out and memory that is from shared
 * libraries.
 *
 * ### RSS
 *
 * RSS is the Resident Set Size and is used to show how much memory is
 * allocated to that process and is in RAM. It does not include memory that is
 * swapped out. It does include memory from shared libraries as long as the
 * pages from those libraries are actually in memory. It does include all stack
 * and heap memory.
 * 
 * @name psaux::parsed
 * @function
 * @param {function} cb called back with an array containing running process information
 *
 * **process info:**
 *
 *  - **user**    : id of the user that owns the process
 *  - **pid**     : process id
 *  - **%cpu**    : percent of the CPU usage
 *  - **%mem**    : percent memory usage
 *  - **vsz**     : virtual memory size
 *  - **rss**     : resident set size
 *  - **tty**     : controlling terminal
 *  - **state**   : current state of the process (i.e. sleeping)
 *  - **started** : start time of process
 *  - **time**    : how long the process is running
 *  - **command** : command line used to start the process (including args)
 */
proto.parsed = function parsed(cb) {
  var self = this;
  self.obtain(function (err, lines) {
    if (err) return cb(err);
    try {
      cb(null, self.parseLines(lines));
    } catch (e) {
      cb(e);
    }
  })  
}

function onprocessInfo(psaux, err, res) {
  // don't emit anything if interval was cleared int he meantime
  if (!psaux._intervalToken) return;

  if (err) return psaux.emit('error', err);
  psaux.emit('info', res);
}

function onobtain(psaux) { 
  psaux.obtain(onobtained)
  function onobtained(err, res) { onprocessInfo(psaux, err, res) }
}

function onobtainParsed(psaux) { 
  psaux.parsed(onparsed)
  function onparsed(err, res) { onprocessInfo(psaux, err, res) }
}

/**
 * Causes the psaux object to obtain process information at the given interval
 * and emit an event for each.
 * When invoked, previously set intervals are cancelled.
 * 
 * @name psaux::setInterval
 * @function
 * @param {Object} opts options 
 * @param {boolean} opts.parsed if true, the process information is parsed before it is emitted (default: `true`)
 * @param {number} opts.interval interval in milliseconds at which to emit process information (default: `20,000`)
 */
proto.setInterval = function setInterval_(opts) {
  opts = xtend({ parsed: true, interval: 20000 }, opts);

  this.clearInterval();

  if (opts.parsed) 
    this._intervalToken = setInterval(onobtainParsed, opts.interval, this)
  else 
    this._intervalToken = setInterval(onobtain, opts.interval, this)
}

/**
 * Clears any previously registered interval at which process information was obtained
 * and emitted.
 *
 * @see psaux::setInterval
 * 
 * @name psaux::clearInterval
 * @function
 */
proto.clearInterval = function clearInterval_() {
  clearInterval(this._intervalToken);
  this._intervalToken = undefined;
}

/**
 * A singleton psaux instance.
 * Use it in order to ensure that you only use one instance throughout your app.
 *
 * #### Example
 *
 * ```js
 * // foo.js
 * var psaux = require('ps-aux').singleton
 * psaux.setInterval({ parsed: true, interval: 5000 });
 *
 * // bar.js
 * var psaux = require('ps-aux').singleton
 * psaux.on('info', console.log);
 * ```
 * 
 * @name psaux::singleton
 * @function
 * @return {object} a constructed `psaux` object
 */
Psaux.singleton = require('./singleton');
