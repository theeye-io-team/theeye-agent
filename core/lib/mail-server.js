var exec = require('child_process').exec;

filterInt = function (value) {
  if( /^([0-9]+)$/.test(value) )
    return Number(value);
  return NaN;
}

module.exports = {
  getQueueSize : function(next)
  {
    var queuesizecmd = "mailq | tail -1 | grep -Eo '[0-9]*.Request' | sed 's/ Request//'" ;
    var intVal ;

    exec(queuesizecmd, function(error,stdout,stderr){
      if( error ) {
        //saraza 1
      }
      else if( stderr ) {
        //saraza 2
      }
      if( ! stdout ) {
        next(null,0);
      }
      else if( ! Number.isNaN(intVal=filterInt(stdout)) ) {
        next(null,intVal);
      }
      else {
        next(new Error('invalid comand response error'),null);
      }
    });
  }
};
