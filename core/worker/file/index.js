'use strict';

var AbstractWorker = require('../abstract');
var File = require('../../lib/file');

var FAILURE_STATE = 'failure';
var SUCCESS_STATE = 'success';
var FILE_CHANGED_STATE = 'file_changed';

var FILE_CHANGED_EVENT = 'monitor:file:success_changed';
var FILE_ERROR_ACCESS_EVENT = 'monitor:file:error_access';
var FILE_ERROR_UNKNOWN_EVENT = 'monitor:file:error_unknown';
var FILE_ERROR_EPERM_EVENT = 'monitor:file:error_perm';

module.exports = AbstractWorker.extend({
  initialize: function () {
    var config = this.config,
      file = this.config.file;

    this.debug.log(this.config);

    this.file = new File({
      id: file.id,
      filename: file.filename,
      md5: file.md5,
      path: config.path,
      uid: config.uid,
      gid: config.gid,
      mode: config.permissions,
    });
  },
  processStatsError: function (err,next) {
    var self = this;
    switch (err.code) {
      case 'ENOENT':
        this.debug.log('downloading file');
        this.downloadFile(function (err) {
          if (err) {
            next(null,{
              state: FAILURE_STATE,
              event: FAILURE_STATE,
              data: {
                message: err.message,
                error: err
              } 
            });
          } else {
            next(null,{
              state: FILE_CHANGED_STATE,
              event: FILE_CHANGED_EVENT,
              data: { } 
            });
          }
        });
        break;
      case 'EMODE':  // file access mode is incorrect
      case 'EOWNER': // file owner is incorrect
      case 'EGROUP': // file group is incorrect 
        self.debug.log('reseting file access setting');
        self.file.setAccess(function(err){
          if (err) {
            if (err.code == 'EPERM') {
              next(null,{
                state: FAILURE_STATE,
                event: FILE_ERROR_EPERM_EVENT,
                data: {
                  message: err.message,
                  error: err
                } 
              });
            } else {
              next(null,{
                state: FAILURE_STATE,
                event: FILE_ERROR_UNKNOWN_EVENT,
                data: {
                  message: err.message,
                  error: err
                } 
              });
            }
          } else {
            next(null,{
              state: FILE_CHANGED_STATE,
              event: FILE_CHANGED_EVENT,
              data: { } 
            });
          }
        });
        break;
      case 'EACCES': // this is bad, can't access file at all, permissions maybe?
        next(null,{
          state: FAILURE_STATE,
          event: FILE_ERROR_ACCESS_EVENT,
          data: {
            message: err.message,
            error: err
          } 
        });
        break;
      default: // unknown error happened
        next(null,{
          state: FAILURE_STATE,
          event: FILE_ERROR_UNKNOWN_EVENT,
          data: {
            message: err.message,
            error: err
          } 
        });
        break;
    }
  },
  getData: function (next) {
    var self = this;
    this.file.stats(function (err,stats) {
      if (err) {
        self.processStatsError(err,next);
      } else {
        self.debug.log('file is ok');
        next(null,{
          state: SUCCESS_STATE,
          event: SUCCESS_STATE,
          data: { stats: stats } 
        });
      }
    });
  },
  downloadFile: function (next) {
		var self = this,
      file = this.file,
      stream = this.connection.fileDownloadStream(file.id);

    file.save(stream,function (error) {
      if (error) {
        self.debug.error(error);
        return next(error);
      } else {
        self.debug.log('file downloaded');
        next(null);
      }
    });
  },
});
