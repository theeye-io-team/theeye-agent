"use strict";

class ScriptOutput {
  constructor (props) {
    this._stdout = props.stdout||'',
    this._stderr = props.stderr||'',
    this._code = props.code||null,
    this._log = props.log||'';
    this._lastline = getLastline( this._log );
  }

  toJSON(){
    return {
      stdout : this._stdout,
      stderr : this._stderr,
      code : this._code,
      log : this._log,
      lastline : this._lastline
    }
  }

  toString(){
    return this._log;
  }

  get stdout() { return this._stdout; }
  get stderr() { return this._stderr; }
  get code() { return this._code; }
  get log() { return this._log; }
  get lastline() { return this._lastline; }
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
