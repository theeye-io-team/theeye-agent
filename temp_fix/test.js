var Psaux = require('ps-aux')
  , psaux = Psaux();

psaux.parsed(function (err, res) {
  if (err) return console.error(err);
  console.log(res);
})
