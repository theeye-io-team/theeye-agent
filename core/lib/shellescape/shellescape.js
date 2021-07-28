const os = require('os')

if (process.platform === 'win32') {
  // https://ss64.com/nt/syntax-esc.html
  function shellescape(a) {
    var ret = [];

    a.forEach(function (s) {
      if (s === '') {
        s = `""`
      } else if (!/^[A-Za-z0-9_\/-]+$/.test(s)) {
        s = s.replace(/"/g,'\\"')
        if (s[s.length - 1] === '\\') {
          s += '\\'
        }

        s = s.replace(new RegExp(os.EOL, 'g'),' ')

        // surround with double quotes
        s = `"${s}"`
      }
      ret.push(s);
    });

    return ret.join(' ');
  }
} else {
  function shellescape(a) {
    var ret = [];

    a.forEach(function (s) {
      if (s === '') {
        s = '""'
      } else if (!/^[A-Za-z0-9_\/-]+$/.test(s)) {
        s = "'" + s.replace(/'/g,"'\\''") + "'";
        s = s.replace(/^(?:'')+/g, '') // unduplicate single-quote at the beginning
          .replace(/\\'''/g, "\\'" ); // remove non-escaped single-quote if there are enclosed between 2 escaped
      }
      ret.push(s);
    });

    return ret.join(' ');
  }
}

// return a shell compatible format
module.exports = shellescape;
