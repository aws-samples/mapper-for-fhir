#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/*
Purpose

This class parses input parameters and deploys the application stack 

*/

import { App, Environment } from 'aws-cdk-lib';
import { Construct } from "constructs";
import { ApplicationStack } from './application-stack';

const app = new App();

export interface BuildConfig {
  readonly awsAccount: string;
  readonly awsRegion: string;
  readonly apiSuffix: string;
  readonly apiMethod: string;
  readonly ahlService: string;
  readonly serviceMapperOperation: string;
  
  
}

/**
 * main cdk app. Define all stacks here so it can be found by cdk.
 */
async function Main() {
  // Get environment from context passed in the commandline arg. Default to 'main' if not present.
  let appEnv = app.node.tryGetContext('env');
  appEnv = (!appEnv || appEnv.trim().length === 0) ? 'main' : appEnv;
  const buildConfig: BuildConfig = getBuildConfig(app, appEnv);

  const env: Environment = {
    account: buildConfig.awsAccount || process.env.CDK_DEFAULT_ACCOUNT,
    region: buildConfig.awsRegion || process.env.CDK_DEFAULT_REGION || 'us-west-2'
  };

  console.info('ACCOUNT 👉', env?.account);
  console.info('REGION 👉', env?.region);
  console.info('BUILD_CONFIG 👉', buildConfig);

  // Deploys the application stack
  new ApplicationStack(app, 'hl7fhirconverter', {
    env,
    environment: appEnv,
    apiSuffix: buildConfig.apiSuffix,
    apiMethod: buildConfig.apiMethod,
    ahlService: buildConfig.ahlService,
    serviceMapperOperation: buildConfig.serviceMapperOperation
  });

  app.synth();
}

/**
 * Validates string value in a json object
 * 
 * @param object Object to be parsed
 * @param propName Field name in the object
 * @param valOrNull If true returns null if hte propName is not present in the object
 * @returns 
 */
function validateString(object: { [name: string]: any }, propName: string, valOrNull = false): string {
  let val = object[propName];
  if ((!object[propName] || object[propName].trim().length === 0) && !valOrNull) {
    throw new Error(propName + "deos not exist or is empty");
  }
  return val;
}

/**
 * 
 * @param app The cdk app
 * @param env The env to deploy to. Passed in the context. E.g. "cdk deploy application -c env=dev"
 * @returns instance of BuildConfig
 */
function getBuildConfig(app: Construct, env: any) {
  let unparsedEnv = app.node.tryGetContext(env);

  let buildConfig: BuildConfig = {
    awsAccount: validateString(unparsedEnv, 'awsAccount'),
    awsRegion: validateString(unparsedEnv, 'awsRegion'),
    apiSuffix: validateString(unparsedEnv, 'apiSuffix'),
    apiMethod: validateString(unparsedEnv,'apiMethod'),
    ahlService: validateString(unparsedEnv,'ahlService'),
    serviceMapperOperation: validateString(unparsedEnv,'serviceMapperOperation')

  };

  return buildConfig;
}

Main();