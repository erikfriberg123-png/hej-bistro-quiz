#!/bin/sh
set -e

brew install node

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

cd "$CI_WORKSPACE_DIRECTORY"
pod install
