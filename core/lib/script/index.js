"use strict";

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var md5 = require('md5');
var exec = require('child_process').exec;
var join = require('path').join;
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('eye:lib:script');
var shellscape = require('shell-escape');

var FILE_MISSING = 'file_missing';
var FILE_OUTDATED = 'file_outdated';

var ScriptOutput = require('./output');

var Script = function (_EventEmitter) {
  _inherits(Script, _EventEmitter);

  function Script(props) {
    _classCallCheck(this, Script);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Script).call(this));

    _this._id = props.id, _this._md5 = props.md5, _this._args = props.args, _this._filename = props.filename, _this._path = props.path, _this._runas = props.runas;

    if (!props.path) throw new Error('scripts path is required.');
    _this._filepath = join(_this._path, _this._filename);
    _this._output = null;
    return _this;
  }

  _createClass(Script, [{
    key: 'checkFile',
    value: function checkFile(done) {
      var _this2 = this;

      fs.exists(this.filepath, function (exists) {
        if (!exists) return done(false, FILE_MISSING);else {
          var buf = fs.readFileSync(_this2.filepath);
          if (md5(buf) != _this2.md5) {
            return done(false, FILE_OUTDATED);
          } else {
            return done(true);
          }
        }
      });
    }
  }, {
    key: 'save',
    value: function save(stream, done) {
      var writable = fs.createWriteStream(this.filepath, { mode: '0755' });

      stream.on('error', function (error) {
        if (done) done(error);
      }).pipe(writable).on('finish', function () {
        if (done) done();
      });

      return this;
    }
  }, {
    key: 'run',
    value: function run() {
      var cli = [this.filepath].concat(this.args);
      var partial = shellscape(cli);
      var formatted;

      var runas = this.runas;
      var regex = /%script%/;

      if (runas && regex.test(runas) === true) {
        formatted = runas.replace(regex, partial);
      } else {
        formatted = partial;
      }

      return this.execScript(formatted);
    }
  }, {
    key: 'execScript',
    value: function execScript(script) {
      var _this3 = this;

      var child = exec(script);
      var emitter = this;

      var partials = { stdout: '', stderr: '', log: '' };

      debug('running script "%s"', script);

      child.stdout.on('data', function (data) {
        partials.stdout += data;
        partials.log += data;

        emitter.emit('stdout', data);
      });

      child.stderr.on('data', function (data) {
        partials.stderr += data;
        partials.log += data;

        emitter.emit('stderr', data);
      });

      child.on('close', function (code) {
        _this3._output = new ScriptOutput({
          code: code,
          stdout: partials.stdout,
          stderr: partials.stderr,
          log: partials.log
        });

        emitter.emit('end', _this3.output);
      });

      return emitter;
    }
  }, {
    key: 'end',
    value: function end(next) {
      this.once('end', next);
    }
  }, {
    key: 'id',
    get: function get() {
      return this._id;
    }
  }, {
    key: 'filepath',
    get: function get() {
      return this._filepath;
    }
  }, {
    key: 'md5',
    get: function get() {
      return this._md5;
    }
  }, {
    key: 'filename',
    get: function get() {
      return this._filename;
    }
  }, {
    key: 'args',
    get: function get() {
      return this._args;
    }
  }, {
    key: 'runas',
    get: function get() {
      return this._runas;
    }
  }, {
    key: 'path',
    get: function get() {
      return this._path;
    }
  }, {
    key: 'output',
    get: function get() {
      return this._output;
    }
  }]);

  return Script;
}(EventEmitter);

module.exports = Script;
