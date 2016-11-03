"use strict";

var NStat = require('iar-node-stat');
var Worker = require('../index').define('dstat');

var FAILURE_STATE = 'failure';
var NORMAL_STATE = 'normal';

Worker.prototype.getData = function(next) {
  var self = this;

  try {
    var nodestat = new NStat();
  } catch (e) {
    self.debug.error('worker failure.', e);
    return next( new Error('worker failure') );
  }

  nodestat.get('stat','mem','net','load','disk',
    function(error, data) {
      if(error) {
        self.debug.error('unable to get data');
        self.debug.error(error);
        return next(new Error('unable to get data'));
      } else {
        var loadArray = data.load;
        var stats = {
          cpu_user: data.stat.cpu.total.user,  
          cpu_system: data.stat.cpu.total.system, 
          cpu_idle: data.stat.cpu.total.idle,
          load_1_minute: loadArray[0],   
          load_5_minute: loadArray[1],   
          load_15_minute: loadArray[2],   
          mem_used: data.mem.used,
          mem_free: data.mem.free,
          mem_total: data.mem.total,
          cacheTotal: data.mem.swaptotal,
          cacheFree: data.mem.swapfree,
          net: data.net,
          disk: data.disk
        }

        self.connection.create({
          route: '/:customer/dstat/:hostname',
          body: stats,
          success:function(body){},
          failure:function(err){}
        });

        self.checkSystemLoad(data,next);
      }
    }
  );
};

Worker.prototype.checkSystemLoad = function(data, next) {
  this.debug.log('checking system load');
  var load = {};
  load.cpu = 100 - data.stat.cpu.total.idle;
  load.mem = (100 * data.mem.used) / data.mem.total;
  load.cache = (100 * (data.mem.swaptotal - data.mem.swapfree)) / data.mem.swaptotal;

  this.debug.log(load);

  load.disk = [];
  var diskAlert = false;
  for(var diskId in data.disk){
    if(diskId!='total'){
      var usage = data.disk[diskId].usage;
      var obj = {
        name: diskId,
        value: null
      };
      var value = obj.value = (100 * usage.used) / usage.total;
      load.disk.push(obj);
      if(value > this.config.limit.disk){
        this.debug.error('ALERT: disk usage is too high');
        diskAlert = true;
      }
    }
  }

  if(load.cpu > this.config.limit.cpu){
    this.debug.error('ALERT: cpu load is too high');
    return next(null,{
      "state": FAILURE_STATE,
      "event":"host:stats:cpu:high",
      "data": load
    });
  }
  if(load.mem > this.config.limit.mem){
    this.debug.error('ALERT: mem usage is too high');
    return next(null,{
      "state": FAILURE_STATE,
      "event":"host:stats:mem:high",
      "data": load 
    });
  }
  if(load.cache > this.config.limit.cache){
    this.debug.error('ALERT: cache usage is too high');
    return next(null,{
      "state": FAILURE_STATE,
      "event":"host:stats:cache:high",
      "data": load,
    });
  }

  if(diskAlert){
    return next(null,{
      "state": FAILURE_STATE,
      "event":"host:stats:disk:high",
      "data": load
    });
  }

  return next(null,{
    "state": NORMAL_STATE,
    "event":"host:stats:normal",
    "data": load
  });
}

module.exports = Worker;
