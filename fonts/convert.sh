#!/usr/bin/env bash

shopt -s nullglob

cd orig

for file in *.ttf *.woff *.woff2; do
  echo "Creating font subset for $file..."
  pyftsubset $file \
    --unicodes='U+0020-00BF,U+0410-044F,U+0401,U+0441' \
    --layout-features='kern' \
    --flavor=woff2 \
    --output-file="../${file%.*}.woff2"
done
