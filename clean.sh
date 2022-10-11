#!/usr/bin/env bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Any subsequent command failures will exit the script immediately
set -e

echo "cleaning folder: ./apps/lambda/FHIR-Converter/dist"
rm -rf ./apps/lambda/FHIR-Converter/dist

if [[ $1 = "all" ]] 
then
    echo "cleaning folder: ./apps/lambda/FHIR-Converter/node_modules"
    rm -rf ./apps/lambda/FHIR-Converter/node_modules    
fi

echo "cleaning folder: ./cdk"
npm run clean --prefix ./cdk
