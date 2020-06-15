
const AbstractWorker = require('../abstract')
const File = require('../../lib/file')
const Constants = require('../../constants')

const EventConstants = require('../../constants/events')

const os = require('os')
var userid
if (os.platform() != 'win32') {
  userid = require('userid')
} else {
  userid = {
    uid: () => null,
    gid: () => null
  }
}

module.exports = AbstractWorker.extend({
  initialize: function () {
    var config = this.config
    var file = config.file
    var mode = config.permissions
    var uid = null
    var gid = null

    if (this.config.os_username) {
      try {
        uid = userid.uid(this.config.os_username)
      } catch (e) {
        this.debug.error(e)
      }
    }
    if (this.config.os_groupname) {
      try {
        gid = userid.gid(this.config.os_groupname)
      } catch (e) {
        this.debug.error(e)
      }
    }

    var specs = {
      id: file.id,
      md5: file.md5,
      basename: config.basename,
      dirname: config.dirname,
      path: config.path,
      mode: mode,
      uid: uid,
      gid: gid
    }

    try {
      this.file = new File(specs)
    } catch (e) {
      this.file = null
      e.code = 'EINIT'
      this.error = e
    }
  },
  processStatsError: function (err,next) {
    var self = this;
    this.debug.error('%s',err.message)
    switch (err.code) {
      case 'ENOENT':
        this.debug.log('downloading file');
        this.downloadFile(function (err) {
          if (err) {
            next(null,{
              state: Constants.ERROR_STATE,
              event: EventConstants.FILE_ERROR_UNKNOWN,
              data: {
                message: err.message,
                error: err
              } 
            });
          } else {
            // file changed , trigger event
            next(null,{
              state: EventConstants.CHANGED,
              event: EventConstants.FILE_RESTORED,
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
                event: EventConstants.FILE_ERROR_EPERM,
                data: {
                  message: err.message,
                  error: err
                } 
              });
            } else {
              next(null,{
                state: Constants.ERROR_STATE,
                event: EventConstants.FILE_ERROR_UNKNOWN,
                data: {
                  message: err.message,
                  error: err
                } 
              });
            }
          } else {
            // file changed , trigger event
            next(null,{
              state: EventConstants.CHANGED,
              event: EventConstants.FILE_RESTORED,
              data: { } 
            });
          }
        });
        break;
      case 'EACCES': // can't access file at all, permissions maybe?
        next(null,{
          state: Constants.FAILURE_STATE,
          event: EventConstants.FILE_ERROR_ACCESS,
          data: {
            message: err.message,
            error: err
          } 
        });
        break;
      default: // unknown error happened
        next(null,{
          state: Constants.ERROR_STATE,
          event: EventConstants.FILE_ERROR_UNKNOWN,
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
            event: EventConstants.FILE_ERROR_UNKNOWN,
            data: {
              message: err.message,
              error: err
            }
          });
        } else {
          // file changed , trigger event
          next(null,{
            state: EventConstants.CHANGED,
            event: EventConstants.FILE_RESTORED,
            data: { }
          });
        }
      });
    } else {
      next(null,{
        state: Constants.ERROR_STATE,
        event: EventConstants.FILE_ERROR_UNKNOWN,
        data: {
          message: err.message,
          error: err
        } 
      });
    }
  },
  getData: function (next) {
    if (!this.file) {
      var err = this.error
      if (!err) {
        err = new Error('EFILE: file was not initialized. worker failed')
      }
      return next(err)
    }

    var self = this
    this.debug.log('checking file stats')
    this.file.checkStats(function (err,stats) {
      if (err) {
        self.processStatsError(err,next)
      } else {
        self.file.checkMd5(function(err){
          if (err) {
            self.processMd5Error(err,next)
          } else {
            self.debug.log('file is ok')
            next(null,{
              state: Constants.SUCCESS_STATE,
              data: { stats: stats } 
            })
          }
        })
      }
    })
  },
  downloadFile: function (next) {
		var self = this
    var file = this.file
    var stream = this.connection.fileDownloadStream(file.id)

    file.save(stream, function (error) {
      if (error) {
        self.debug.error(error)
        return next(error)
      } else {
        self.debug.log('file downloaded')
        next(null)
      }
    })
  }
})
