#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Any subsequent command failures will exit the script immediately
set -e

echo "Cleaning..."
./clean.sh

echo "Building..."
./build.sh

echo "Deploying application stack..."
npm run cdk-deploy --silent --prefix ./cdk -- --require-approval never
