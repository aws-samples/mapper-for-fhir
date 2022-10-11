#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Any subsequent command failures will exit the script immediately
set -e

npm run build --prefix ./apps/lambda/FHIR-Converter
npm run build --prefix ./cdk

echo "Build successful"
