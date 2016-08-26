"use strict";

function ScriptOutput(props){

  var _stdout = props.stdout||'';
  var _stderr = props.stderr||'';
  var _code = props.code||null;
  var _log = props.log||'';
  var _lastline = getLastline( _log );

  this.toJSON = function toJSON(){
    return {
      stdout : this.stdout,
      stderr : this.stderr,
      code : this.code,
      log : this.log,
      lastline : this.lastline
    }
  }

  this.toString = function toString(){
    return this.log;
  }

  Object.defineProperty(this,"stdout",{
    get: function() { return _stdout; },
    enumerable:true,
  });
  Object.defineProperty(this,"stderr",{
    get: function() { return _stderr; },
    enumerable:true,
  });
  Object.defineProperty(this,"code",{
    get: function() { return _code; },
    enumerable:true,
  });
  Object.defineProperty(this,"log",{
    get: function() { return _log; },
    enumerable:true,
  });
  Object.defineProperty(this,"lastline",{
    get: function() { return _lastline; },
    enumerable:true,
  });
}

module.exports = ScriptOutput ;

function getLastline(str){
  var parsed;
  var line = lastline( str );
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    parsed = line;
  }
  return parsed;
}

function lastline(str){
  var fromIndex ;

  if(!str) return str;

  if( str[ str.length - 1 ] === "\n" ){
    fromIndex = str.length - 2; // ignore last end of line
  } else {
    fromIndex = str.length - 1;
  }

  var idx = str.lastIndexOf("\n", fromIndex);

  var line;
  if(idx === -1) { // its one line string
    line = str.trim(); // remove spaces and return chars
  } else {
    line = str.substring(idx).trim();
  }
  return line.replace(/(\n|\r)+$/, '').trim();
}
