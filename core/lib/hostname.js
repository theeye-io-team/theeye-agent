const config = require('config')

module.exports = (function() {

  let hostname = process.env.THEEYE_CLIENT_HOSTNAME ||
    (config.supervisor&&config.supervisor.client_hostname)

  return hostname || require('os').hostname()

})();
