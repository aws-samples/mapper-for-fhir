#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Any subsequent command failures will exit the script immediately
set -e

echo "Building..."
./build.sh

echo "Synthesizing CDK to CFN..."
# npm run cdk-synth --prefix ./cdk -- -c env=$1 $2
npm run cdk-synth --prefix ./cdk
