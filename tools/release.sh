#!/bin/sh
# Stamp a new version into app.js + sw.js so installed phones pick up the update, then run tests.
set -e
cd "$(dirname "$0")/.."
V="$(date +%Y.%m.%d-%H%M)"
sed -i '' "s/^const VERSION = \"[^\"]*\";/const VERSION = \"$V\";/" dist/app.js dist/sw.js
node --test tests/
echo "version $V — commit and push to main to deploy"
