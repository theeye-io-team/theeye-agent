var util = require('util');
var AbstractWorker = require('./abstract');

var mail = require('../../lib/mail-server');

function Worker(cn,cf)
{
  this.debug = {
    log   : require('debug')('eye:agent:worker:mailq:' + cf.name),
    error : require('debug')('eye:agent:worker:mailq:' + cf.name + ':error'),
  }
  this.debug.log('creating worker service "%s"', cf.name);

  AbstractWorker.apply(this,arguments);
}

util.inherits(Worker, AbstractWorker);

Worker.prototype.getData = function(next) {

  var self = this ;

  mail.getQueueSize(function(error,size){
    if( error )
    {
      self.debug.error(error.message);
      next(error,null);
    }
    else if( size > self.config.upper_limit )
    {
      self.debug.log('mailq size %s is high', size);
      next(null,{
        'state' : 'failure',
        'data' : { 'count' : size }
      });
    }
    else if( size <= self.config.upper_limit )
    {
      self.debug.log('queue is normal');
      next(null,{
        'state' : 'normal',
        'data' : { 'count' : size }
      });
    }
    else
    {
      self.debug.error('wtf!');
      self.debug.error('wtf!');
      self.debug.error('wtf!');
      self.debug.error('wtf!');
      self.debug.error('wtf!');
    }
  });

};

module.exports = Worker;
