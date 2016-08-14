'use strict';

var psaux = require('./')
  , ifndef = require('1t')

ifndef('__PSAUX__', module, function onifndef() {
  module.exports = psaux();  
})
