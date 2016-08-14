'use strict';

var test = require('tap').test
var psaux = require('../')()

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

test('\nwe are able to get process info without erroring and the amount of parsed processes equals the number of raw process info', function (t) {
  var raw, obj

  psaux.obtain(function (err, res) {
    if (err) { t.fail(err); return t.end(); }
    raw = res;
    parsed()
  })

  function parsed() {
    psaux.parsed(function (err, res) {
      if (err) { t.fail(err); return t.end(); }
      obj = res;
      check()  
    })
  }

  function check() {
    t.ok(raw.length > 0, 'returns at least one raw line')
    t.ok(obj.length > 0, 'returns at least one parsed line')

    t.equal(raw.length, obj.length, 'has as many raw lines as parsed')
    t.end()
  }
})
