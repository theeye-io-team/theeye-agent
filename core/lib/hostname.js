
module.exports = (function() {

  var config = require('config');

  var hostname ;

  hostname = process.env.AGENT_HOSTNAME ? 
    process.env.AGENT_HOSTNAME :
    config.has('hostname') ? config.get('hostname') : null ;

  return hostname || require('os').hostname() ;

})();
