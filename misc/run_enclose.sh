#!/bin/bash

root="$PWD"

cd $root/node_modules/config
npm install hjson toml cson properties

cd $root
enclose -o bin/theeye-agent -l warning core/main.js
