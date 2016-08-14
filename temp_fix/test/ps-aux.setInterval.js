'use strict';

var test = require('tap').test
var psaux = require('../')

function inspect(obj, depth) {
  console.error(require('util').inspect(obj, false, depth || 5, true));
}

test('\ncreateing psaux and setting an interval 50 and then another one of 70 and finally clearing the interval', function (t) {
  var infos = []
  var ps = psaux()

  ps.on('error', function (err) {  t.fail(err); return t.end(); })
    .on('info', function (info) { infos.push(info) })
    .setInterval({ interval: 50 })

  setTimeout(check280, 280)

  function check280() {
    t.ok(4 >= infos.length <= 5, 'emmitted 4 to 5 more infos after 280 milliseconds')

    infos.length = 0;
    ps.setInterval({ interval: 70 })
    setTimeout(check310, 310);
  }

  function check310() {
    t.ok(3 >= infos.length <= 4, 'emmitted 3 to 4 more infos after 310 milliseconds')

    ps.clearInterval();
    setTimeout(check200, 200);
    infos.length = 0;
  }

  function check200() {
    t.equal(infos.length, 0, 'emmitted no more infos after interval was cleared')
    t.end()
  }
})
