#!/bin/bash

#exec 3>&1 4>&2
#trap 'exec 2>&4 1>&3' 0 1 2 3
#exec 1>run_enclose.out 2>&1
# Everything below will go to the file 'run_enclose.out':

command -v pkg >/dev/null 2>&1 || { echo >&2 "pkg is required but it's not installed."; echo "failure"; exit 2; }

root="$PWD"
target="bin"
node_version="node6-linux"
release="$target/release"

if [ -d "$target" ]; then
  rm -rf $target
fi

if [ -d "node_modules" ]; then
  echo "rebuilding node_modules"
  rm -rf "$PWD/node_modules"
fi

command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but it's not installed."; echo "failure"; exit 1; }

npm install --production

echo "creating $target"
mkdir $target

if [ ! -d "node_modules" ]; then
  echo "running npm --production"
  npm install
fi

#cd $root/node_modules/config

echo "running npm version $(npm --version)"

# add extra dependencies - not used by the agent anyway. but just to avoid errors and warnings
npm install hjson toml cson properties x2js

# run enclose
cd $root

pkg -v 
echo "running pkg"
pkg --targets $node_version --output $target/theeye-agent --debug core/main.js

# copy bindings
echo "copying bindings"
cp node_modules/userid/build/Release/userid.node $target
cp node_modules/ref/build/Release/binding.node $target
cp node_modules/ffi/build/Release/ffi_bindings.node $target

echo "copying configs"
# copy configs
if [ ! -d "$target/config" ]; then
  echo "creating $target/config"
  mkdir $target/config
fi

cp config/default.js $target/config
cp config/production.js $target/config

if [ -z "$NODE_ENV" ]; then
  NODE_ENV=''
else
  echo "copying $NODE_ENV config"
  cp config/$NODE_ENV.js $target/config
fi

echo -e "Agent Version \t\t$(git describe)" >> $release
echo -e "NODE_ENV config \t\t$NODE_ENV" >> $release
echo -e "Node Version \t\t$node_version" >> $release
echo -e "NPM Version \t\t$(npm --version)" >> $release
echo -e "PKG Version \t\t$(pkg --version)" >> $release

echo "summary"
cat $target/release

echo "success"
