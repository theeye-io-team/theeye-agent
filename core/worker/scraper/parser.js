var stream = require('stream');
var util = require('util');

// node v0.10+ use native Transform, else polyfill
var Transform = stream.Transform || require('readable-stream').Transform;

function Parser(options) {
  // allow use without new
  if( !(this instanceof Parser) ) {
    return new Parser(options);
  }

  options.objectMode = true ;
  // init Transform
  Transform.call(this, options);

  this.pattern = new RegExp( options.pattern );
  this.result = null ;
}

util.inherits(Parser, Transform);

Parser.prototype._transform = function (chunk, enc, next) {
  // if is Buffer use it, otherwise coerce
  if( this.result === null ) {
    this.result = this.pattern.exec( chunk.toString() );
  }
  next();
};

Parser.prototype._flush = function (next) {
  if( this.result != null ) {
    // the parser must return an output stream
    this.push( this.result.input );
    this.emit("pattern_matched");
  } else {
    var error = new Error('pattern doesn\'t match');
    error.name = 'ParseError' ;
    this.emit("error", error);
  }
  next();
};

module.exports = Parser ;
