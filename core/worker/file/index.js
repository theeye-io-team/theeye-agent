'use strict';

var AbstractWorker = require('../abstract');
var File = require('../../lib/file');
var Constants = require('../../constants');

var FILE_CHANGED_EVENT = 'monitor.file.success_changed';
var FILE_ERROR_ACCESS_EVENT = 'monitor.file.error_access';
var FILE_ERROR_UNKNOWN_EVENT = 'monitor.file.error_unknown';
var FILE_ERROR_EPERM_EVENT = 'monitor.file.error_perm';

module.exports = AbstractWorker.extend({
  initialize: function () {
    var config = this.config,
      file = this.config.file;

    try {
      this.file = new File({
        id: file.id,
        md5: file.md5,
        basename: config.basename,
        dirname: config.dirname,
        path: config.path,
        uid: config.uid,
        gid: config.gid,
        mode: config.permissions,
      });
    } catch (e) {
      this.file = null;
      e.code = 'EINIT';
      this.error = e;
    }
  },
  processStatsError: function (err,next) {
    var self = this;
    switch (err.code) {
      case 'ENOENT':
        this.debug.log('downloading file');
        this.downloadFile(function (err) {
          if (err) {
            next(null,{
              state: Constants.ERROR_STATE,
              event: FILE_ERROR_UNKNOWN_EVENT,
              data: {
                message: err.message,
                error: err
              } 
            });
          } else {
            // file changed , trigger event
            next(null,{
              state: Constants.CHANGED_STATE,
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
                state: Constants.FAILURE_STATE,
                event: FILE_ERROR_EPERM_EVENT,
                data: {
                  message: err.message,
                  error: err
                } 
              });
            } else {
              next(null,{
                state: Constants.ERROR_STATE,
                event: FILE_ERROR_UNKNOWN_EVENT,
                data: {
                  message: err.message,
                  error: err
                } 
              });
            }
          } else {
            // file changed , trigger event
            next(null,{
              state: Constants.CHANGED_STATE,
              event: FILE_CHANGED_EVENT,
              data: { } 
            });
          }
        });
        break;
      case 'EACCES': // can't access file at all, permissions maybe?
        next(null,{
          state: Constants.FAILURE_STATE,
          event: FILE_ERROR_ACCESS_EVENT,
          data: {
            message: err.message,
            error: err
          } 
        });
        break;
      default: // unknown error happened
        next(null,{
          state: Constants.ERROR_STATE,
          event: FILE_ERROR_UNKNOWN_EVENT,
          data: {
            message: err.message,
            error: err
          } 
        });
        break;
    }
  },
  processMd5Error: function(err,next) {
    if (err.code === 'EMD5') {
      // download file again
      this.downloadFile(function (err) {
        if (err) {
          next(null,{
            state: Constants.ERROR_STATE,
            event: FILE_ERROR_UNKNOWN_EVENT,
            data: {
              message: err.message,
              error: err
            }
          });
        } else {
          // file changed , trigger event
          next(null,{
            state: Constants.CHANGED_STATE,
            event: FILE_CHANGED_EVENT,
            data: { }
          });
        }
      });
    } else {
      next(null,{
        state: Constants.ERROR_STATE,
        event: FILE_ERROR_UNKNOWN_EVENT,
        data: {
          message: err.message,
          error: err
        } 
      });
    }
  },
  getData: function (next) {
    if (!this.file) {
      var err = this.error;
      if (!err) {
        err = new Error('EFILE: file was not initialized. worker failed');
      }
      return next(err);
    }

    var self = this;
    this.file.checkStats(function (err,stats) {
      if (err) {
        self.processStatsError(err,next);
      } else {
        self.file.checkMd5(function(err){
          if (err) {
            self.processMd5Error(err,next);
          } else {
            self.debug.log('file is ok');
            next(null,{
              state: Constants.SUCCESS_STATE,
              data: { stats: stats } 
            });
          }
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
