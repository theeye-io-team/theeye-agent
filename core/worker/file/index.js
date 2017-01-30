'use strict';

var AbstractWorker = require('../abstract');
var File = require('../../lib/file');

var FAILURE_STATE = 'failure';
var SUCCESS_STATE = 'success';
var FILE_CHANGED_STATE = 'file_changed';

var FILE_CHANGED_EVENT = 'monitor:file:changed';

module.exports = AbstractWorker.extend({
  initialize: function(){
    var config = this.config,
      file = this.config.file;

    this.debug.log(this.config);

    this.file = new File({
      id: file.id,
      filename: file.filename,
      md5: file.md5,
      path: config.path,
      owner: config.owner,
      group: config.group,
      mode: config.permissions,
    });
  },
  getData: function(next){
    var self = this;
		this.file.checkFile(function(success){
			if (!success) { // not present or outdated
				self.debug.log('downloading file');
				self.downloadFile(function(err){
          if (err) {
            next(null,{
              state: FAILURE_STATE,
              event: 'failure',
              data: { error : err } 
            });
          } else {
            next(null,{
              state: FILE_CHANGED_STATE,
              event: FILE_CHANGED_EVENT,
              data: { } 
            });
          }
        });
			} else {
				self.debug.log('file is ok');
        next(null,{
          state: SUCCESS_STATE,
          event: 'success',
          data: { } 
        });
			}
		});
  },
  downloadFile: function(next){
		var self = this,
      file = this.file,
      stream = this.connection.fileDownloadStream(file.id);

    file.save(stream,function(error){
      if (error) {
        self.debug.error(error);
        return next(error);
      } else {
        self.debug.log('file downloaded');
        next(null);
      }
    });
  }
});
