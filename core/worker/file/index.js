'use strict';

var AbstractWorker = require('../abstract');
var File = require('../../lib/file');

module.exports = AbstractWorker.extend({
  initialize: function(){
    var config = this.config;
    this.debug.log(this.config);
    this.file = new File({
      id: config.id,
      filename: config.filename,
      md5: config.md5,
      path: config.path
    });
  },
  getData: function(next){
    var self = this;
		this.file.checkFile(function(success){
			if (!success) { // not present or outdated
				self.debug.log('downloading file');
				self.downloadFile(next);
			} else {
				self.debug.log('file is ok');
				next();
			}
		});
  },
  downloadFile: function(next){
		var self = this,
      stream = this.connection.fileDownloadStream(this.file.id);

		this.file.save(stream,function(error){
			if (error) {
				self.debug.error(error);
				return done(error);
			}
			self.debug.log('file downloaded');
			done();
		});
  }
});
