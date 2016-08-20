"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ScriptOutput = function () {
  function ScriptOutput(props) {
    _classCallCheck(this, ScriptOutput);

    this._stdout = props.stdout || '', this._stderr = props.stderr || '', this._code = props.code || null, this._log = props.log || '';
    this._lastline = getLastline(this._log);
  }

  _createClass(ScriptOutput, [{
    key: 'toJSON',
    value: function toJSON() {
      return {
        stdout: this._stdout,
        stderr: this._stderr,
        code: this._code,
        log: this._log,
        lastline: this._lastline
      };
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this._log;
    }
  }, {
    key: 'stdout',
    get: function get() {
      return this._stdout;
    }
  }, {
    key: 'stderr',
    get: function get() {
      return this._stderr;
    }
  }, {
    key: 'code',
    get: function get() {
      return this._code;
    }
  }, {
    key: 'log',
    get: function get() {
      return this._log;
    }
  }, {
    key: 'lastline',
    get: function get() {
      return this._lastline;
    }
  }]);

  return ScriptOutput;
}();

module.exports = ScriptOutput;

function getLastline(str) {
  var parsed;
  var line = lastline(str);
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    parsed = line;
  }
  return parsed;
}

function lastline(str){
  var fromIndex ;

  if(!str) return str;

  if( str[ str.length - 1 ] === "\n" ){
    fromIndex = str.length - 2; // ignore last end of line
  } else {
    fromIndex = str.length - 1;
  }

  var idx = str.lastIndexOf("\n", fromIndex);

  var line;
  if(idx === -1) { // its one line string
    line = str.trim(); // remove spaces and return chars
  } else {
    line = str.substring(idx).trim();
  }
  return line.replace(/(\n|\r)+$/, '').trim();
}
