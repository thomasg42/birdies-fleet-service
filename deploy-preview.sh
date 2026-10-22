#!/usr/bin/env bash
# GitHub Pages publish for Birdies. DO NOT RUN until Thomas says publish.
# Pages stays off. This script exits unless BIRDIE_PUBLISH=yes is set in the environment
# by Thomas, in his own terminal, on purpose.
set -euo pipefail

if [ "${BIRDIE_PUBLISH:-}" != "yes" ]; then
  echo "Refusing to publish. GitHub Pages stays off until Thomas sets BIRDIE_PUBLISH=yes and runs this himself."
  exit 1
fi

SRC="$(cd "$(dirname "$0")" && pwd)"
REPO="thomasg42/birdies-fleet-service"
URL="https://thomasg42.github.io/birdies-fleet-service/"

cd "$SRC"
echo "1/4 Building production..."
node build.mjs
echo "2/4 Testing..."
node --test tests/site.test.mjs
echo "3/4 This would push main and turn on Pages from /docs."
echo "    Repo: https://github.com/$REPO"
echo "    URL:  $URL"
echo "4/4 Stop. Lane 3 does not flip Pages on from this sandbox."
echo "Thomas: review main, then enable Pages (branch main, folder /docs) from the repo settings."
exit 1
