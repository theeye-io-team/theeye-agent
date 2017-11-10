'use strict';

var Script = require('../../lib/script');
var AbstractWorker = require('../abstract');
var Constants = require('../../constants');
var join = require('path').join;

module.exports = AbstractWorker.extend({
  initialize: function(){
    var directory = process.env.THEEYE_AGENT_SCRIPT_PATH;
    var config = this.config.script;
    this.script = new Script({
      id: config.id,
      args: config.arguments||[],
      runas: config.runas,
      md5: config.md5,
      dirname: directory,
      basename: config.filename,
      path: join(directory, config.filename),
    });
  },
  checkScript: function(next){
    var self = this;

    this.script.checkAccess(function(err){
      if (err) { // no access to file
        if (err.code === 'ENOENT') { // file does not exists
          self.downloadScript(next);
        } else { // this is worst, can't access file at all, permissions maybe?
          return next(err);
        }
      } else {
        // no error, check md5
        self.script.checkMd5(function(err){
          if (err) {
            if (err.code === 'EMD5') {
              self.downloadScript(next);
            } else { // validation error unknown
              return next(err);
            }
          } else {
            self.debug.log('script is ok');
            next();
          }
        });
      }
    });
  },
  downloadScript: function(done){
    var self = this;
    this.debug.log('getting script %s', this.script.id);
    var stream = this.connection.scriptDownloadStream(this.script.id);

    this.debug.log('download stream');
    this.script.save(stream,function(error){
      if(error){
        self.debug.error(error);
        return done(error);
      }
      self.debug.log('script downloaded');
      done();
    });
  },
  getData: function(next) {
    var self = this

    this.checkScript(function(error){
      self.script.run(function(result){
        const lastline = result.lastline
        const data = Object.assign({}, result)

        var output, state, payload

        try {
          // try to parse lastline string as JSON output
          output = JSON.parse(lastline)
          if (isObject(output)) {
            if (output.state) state = output.state
            else state = null
          } else {
            if (typeof output === 'string') {
              state = output
            } else {
              state = null
            }
          }
          data.output = output
        } catch (e) {
          // if it is not a JSON
          self.debug.error('cannot parse output. invalid JSON')
          self.debug.error(e.message)
          state = lastline // a string
        }

        payload = { state: state, data: data }

        self.debug.log('execution result is %j', payload)

        return next(null, payload)
      })
    })
  }
})

function isObject (value) {
  return Object.prototype.toString.call(value) == '[object Object]'
}
