#!/bin/bash

#exec 3>&1 4>&2
#trap 'exec 2>&4 1>&3' 0 1 2 3
#exec 1>run_enclose.out 2>&1
# Everything below will go to the file 'run_enclose.out':

root="$PWD"
target="bin"
node_version="v6.3.1"
release="$target/release"

if [ -d "$target" ]; then
  rm -rf $target
fi

echo "creating $target"
mkdir $target

if [ ! -d "node_modules" ]; then
  echo "running npm --production"
  npm install --production
fi

cd $root/node_modules/config

npm --version

# add extra dependencies - not used by the agent anyway. but just to avoid errors and warnings
npm install hjson toml cson properties

# run enclose
cd $root

enclose --version $node_version -o $target/theeye-agent --loglevel warning core/main.js

# copy bindings
echo "copying bindings"
cp node_modules/ref/build/Release/binding.node $target
cp node_modules/ffi/build/Release/ffi_bindings.node $target

echo "copying configs"
# copy configs
if [ ! -d "$target/config" ]; then
  echo "creating $target/config"
  mkdir $target/config
fi
cp config/default.js $target/config

if [ -z "$NODE_ENV" ]; then
  echo "copying production"
  cp config/production.js $target/config
else  
  echo "copying $NODE_ENV"
  cp config/$NODE_ENV.js $target/config
fi


echo "Agent Version $(git describe)" >> $release
echo "NODE_ENV $NODE_ENV" >> $release
echo "Node Version $node_version" >> $release

echo "end"
