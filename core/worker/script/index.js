'use strict';

var Script = require('../../lib/script');
var AbstractWorker = require('../abstract');

function detectEvent (data) {
  if (data.killed) return 'killed';
  return undefined;
}

function isObject (value) {
  return Object.prototype.toString.call(value) == '[object Object]';
}

module.exports = AbstractWorker.extend({
  initialize: function(){
    var path = process.env.THEEYE_AGENT_SCRIPT_PATH;
    var config = this.config.script;
    this.script = new Script({
      id: config.id,
      args: config.arguments||[],
      runas: config.runas,
      filename: config.filename,
      md5: config.md5,
      path: path,
    });
  },
	checkScript: function(next){
		var self = this;
		this.script.checkFile(function(success){
			if(!success){ // not present or outdated
				self.debug.log('script need to be downloaded');
				self.downloadScript(next);
			} else {
				self.debug.log('script is ok');
				next();
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
  getData : function(next) {
    var self = this;

    this.checkScript(function(error){
      // if(error) return done(error);
      self.script.run(function(result){
        var json, state, payload, lastline = result.lastline;

        try {
          // try to convert JSON
          json = JSON.parse(lastline);
        } catch (e) {
          // it is not JSON
          self.debug.error('cannot parse output. invalid JSON');
          self.debug.error(e.message);
          json = null;
        }

        if (json) {
          state = isObject(json) ? json.state : json; // if object ? object.state : object as is .
        } else {
          state = lastline; // ok , just asume the last line is the result state
        }

        payload = {
          script_result: result,
          state: state,
          event: detectEvent(result)||state,
          // data is available only when the script returns it
          data: json?(json.data||json):undefined
        };

        self.debug.log('execution result is %j', payload);
        return next(null,payload);
      });
    });
  }
});
