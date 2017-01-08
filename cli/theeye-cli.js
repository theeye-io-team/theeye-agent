#!/usr/bin/env node

"use strict";

var program = require('commander');
var colors = require('colors');

program
  .version('0.0.1')
  .option('-a, --action [create|get|update|patch|remove]', 'Resource action')
  .option('-r, --resource [name]', 'Remote resource name')
  .option('-p, --path [path]', 'Full remote resource path')
  .option('-b, --body [jsonText]', 'Request body params in json format')
  .option('-q, --query [jsonText]', 'Request query string in json format')
  .parse(process.argv);

function make_green(txt) {
  return colors.green(txt);
}

if (!process.argv.slice(2).length) {
  program.outputHelp(make_green);
  process.exit();
}

if (!program.action) {
  console.log('');
  console.log('action is requred');
  program.outputHelp(make_green);
  process.exit();
}

if (!program.resource&&!program.path) {
  console.log('');
  console.log('resource or path is requred');
  program.outputHelp(make_green);
  process.exit();
}

require('../core/environment')(function(){

  var debug = require('debug')('eye:cli:main');
  debug('cli started');

  var app = require('../core/app');

  function runRemoteCommand () {
    var action = program.action.toLowerCase(),
      route, body, query;

    try {
      if (program.body) {
        body = JSON.parse(program.body);
      }
    } catch (e) {
      console.log('invalid body');
      console.log(e);
      process.exit();
    }

    try {
      if (program.query) {
        query = JSON.parse(program.query);
      }
    } catch (e) {
      console.log('invalid query');
      console.log(e);
      process.exit();
    }

    var connection = app.connection;

    if (program.resource) {
      route = '/:customer/' + program.resource.toLowerCase();
    } else if (program.path) {
      route = program.path;
    }

    connection[action]({
      route: route,
      success: function(body, request){
        console.log(body);
      },
      failure: function(error, request){
        if (error.body=='forbidden') {
          console.log('');
          console.log('it seems you don\'t have the required permissions to perform this action');
          console.log('');
        }
        console.log('error       : %s', error.body);
        console.log('status code : %s', error.statusCode);
        console.log('');
      }
    });
  }

  app.startCLI(function(){
    runRemoteCommand();
  });

});
