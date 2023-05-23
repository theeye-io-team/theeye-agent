#!/bin/bash

#exec 3>&1 4>&2
#trap 'exec 2>&4 1>&3' 0 1 2 3
#exec 1>run_enclose.out 2>&1
# Everything below will go to the file 'run_enclose.out':

command -v pkg >/dev/null 2>&1 || { echo >&2 "pkg is required but it's not installed."; echo "failure"; exit 2; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but it's not installed."; echo "failure"; exit 1; }

os="${1}"

root="${PWD}"
target="bin"
release="${target}/release"

if [[ "${os}" == 'win' ]]
then
	echo "Windows build"
	node_version="node16-win-x64"
else
	echo "Linux build"
	node_version="node16-linux-x64"
fi

echo "current working directory is ${root}"

if [ -d "${target}" ]; then
  rm -rf ${target}
fi

if [ -d "node_modules" ]; then
  echo "rebuilding node_modules"
  rm -rf "${root}/node_modules"
fi

echo "creating ${target}"
mkdir ${target}

echo "running npm version $(npm --version)"
npm install

echo "adding extra dependencies"
# add extra dependencies - not used by the agent anyway - just to avoid errors and warnings
npm install hjson toml cson properties x2js

# run pkg
cd $root


agent_version=$(git describe)
echo "### BUILDING AGENT ${agent_version}"
echo "adding agent version to the sources"
cat <<VERSION_FILE > ${root}/core/constants/version.js
exports.version = "${agent_version}"
VERSION_FILE


echo "running pkg " $(pkg -v) 
pkg --targets ${node_version} --output ${target}/theeye-agent --debug ${root}/core/main.js

# copy bindings
echo "copying bindings"
#ls -l ${root}/node_modules/userid/build
#cp ${root}/node_modules/userid/build/Release/userid.node ${target}
#
#ls -l ${root}/node_modules/ref/build
#cp ${root}/node_modules/ref/build/Release/binding.node ${target}
#
#ls -l ${root}/node_modules/ffi/build
#cp ${root}/node_modules/ffi/build/Release/ffi_bindings.node ${target}

echo "Diskusage"
ls -l ${root}/node_modules/diskusage/build/Release/
cp ${root}/node_modules/diskusage/build/Release/diskusage.node ${target}

echo "copying configs"
# copy configs
if [ ! -d "${target}/config" ]; then
  echo "creating ${target}/config"
  mkdir ${target}/config
fi

cp ${root}/config/default.js ${target}/config
cp ${root}/config/production.js ${target}/config

if [ -z "${NODE_ENV}" ]; then
  NODE_ENV=''
else
  echo "copying ${NODE_ENV} config"
  cp ${root}/config/${NODE_ENV}.js ${target}/config
fi

echo -e "Agent Version \t\t${agent_version}" >> $release
echo -e "NODE_ENV config \t\t${NODE_ENV}" >> $release
echo -e "Node Version \t\t${node_version}" >> $release
echo -e "NPM Version \t\t$(npm --version)" >> $release
echo -e "PKG Version \t\t$(pkg --version)" >> $release

echo "summary"
cat ${target}/release

echo "success"
