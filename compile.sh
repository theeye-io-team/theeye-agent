#!/bin/bash
AGENT_DIR=`pwd`
#npm install
cd node_modules/config
npm install hjson toml cson properties
cd $AGENT_DIR

./enclose core/main.js -o core/bin -v v4.4.7
