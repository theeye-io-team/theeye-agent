
module.exports = (function() {

  return process.env.THEEYE_CLIENT_HOSTNAME || require('os').hostname() ;

})();
