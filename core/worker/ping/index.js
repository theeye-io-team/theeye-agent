var AbstractWorker = require('../abstract')

module.exports = AbstractWorker.extend({
  type: 'ping',
  // no data
  getData: function (next) {
    return {}
  },
  keepAlive: function () {
    var self = this;
    this.connection.update({
      route: '/:customer/agent/:hostname',
      failure: function (err) {
        self.debug.error(err)
      },
      success: function (body) {}
    })
    this.sleep();
  }
})
