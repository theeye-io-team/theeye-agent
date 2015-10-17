
var FAILURE_STATE = 'failure';
var NORMAL_STATE  = 'normal';

var Worker = require('../index').define('keepAlive');

Worker.prototype.getData = function(next)
{
  return next(null,{ state: NORMAL_STATE });
}

module.exports = Worker;
