#!/bin/bash
AGENT_DIR=`pwd`
#npm install
cd node_modules/config
npm install hjson toml cson properties
cd $AGENT_DIR

node_modules/.bin/enclose --features=no -l warning -o core/bin.exe -v v4.4.7 core/main.js 
