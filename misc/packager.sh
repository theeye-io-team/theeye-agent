#!/bin/bash

root="$PWD"
target="theeye-agent"
bin="bin"

if [ ! -d "$target" ]; then
  mkdir $target
fi

echo "copying files"

if [ ! -d "$bin" ]; then
  echo "$PWD/$bin not found"
  exit 1
fi

if [ ! -d "misc" ]; then
  echo "$PWD/misc not found"
  exit 1
fi

if [ ! -f "runBinary.sh" ]; then
  echo "$PWD/runBinary.sh not found"
  exit 1
fi

mkdir $target/misc
cp -r $bin $target
cp -r runBinary.sh $target/
cp -r misc/etc $target/misc/etc
cp misc/theeye.conf $target/misc/
cp misc/uninstall.sh $target/misc/

echo "adding version to package"

release=`git describe`

echo $release > $target/version

echo "creating package"

tar -czf theeye-agent64-$release.tar.gz $target

echo "removing temporal files"

rm -rf $target

echo "success"
