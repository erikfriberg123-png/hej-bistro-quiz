#!/bin/sh
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

cd "$CI_WORKSPACE_DIRECTORY"
pod install
