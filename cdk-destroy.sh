#!/usr/bin/env bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Any subsequent command failures will exit the script immediately
set -e

echo "Destroying CDK Cloudformation Stack"
read -p "Do you want to continue? (y/n)? " -n 1 -r
echo 
if [[ $REPLY =~ ^[Nn]$ ]]
then
    exit 0
fi
npm run cdk-destroy --prefix ./cdk
