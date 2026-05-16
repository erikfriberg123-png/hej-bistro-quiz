#!/bin/sh
set -e

cd "$CI_WORKSPACE_DIRECTORY/ios"
pod install
