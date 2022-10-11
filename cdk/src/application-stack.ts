//Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
//SPDX-License-Identifier: Apache-2.0

/*
Purpose

The ApplicationStack class is responsible for the creation of the 
HL7 translation lambda function APIFunction, the Invoker-Parser lambda function
the API Gateway and WAF instance along with all needed IAM roles

*/

import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as healthlake from 'aws-cdk-lib/aws-healthlake';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime, Version } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { RestAPIProxy } from './rest-api-proxy';
import { WafRegionalStack } from './waf-regional';

export interface ApplicationStackProps extends StackProps {
  environment: string;
  apiSuffix: string;
  apiMethod: string;
  ahlService: string;
  serviceMapperOperation: string;
}

export class ApplicationStack extends Stack {

  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    // Rest API function written using express nodejs framework
    const expressRestApiFunction = new Function(this, "APIFunction", {
      runtime: Runtime.NODEJS_14_X,
      handler: "handler.handler",
      code: Code.fromAsset("../apps/lambda/FHIR-Converter/dist",
      ),
      timeout: Duration.seconds(30),
      memorySize: 512,
      functionName: "FHIR-Converter"
    });

    const cfnFHIRDatastore = new healthlake.CfnFHIRDatastore(this, 'FHIRDatastore', {
      datastoreTypeVersion: 'R4',
      datastoreName: 'FHIR-Store',
    });


    // Create a web application firewall
    const wafRegional = new WafRegionalStack(this, 'WafRegional');

    const apiProxy = new RestAPIProxy(this, 'RestAPIs', wafRegional, props.environment, expressRestApiFunction);
    apiProxy.addDependency(wafRegional);
    new CfnOutput(this, 'APIUrl', { value: 'https://' + apiProxy.apiDomain });

    //IAM policy statement for Invoker Lambda function
    const lambdaInvokerHealthlakePolicy = new PolicyStatement({
      actions: ['healthlake:CreateResource', 'healthlake:UpdateResource', 'healthlake:ProcessBundle'],
      resources: [cfnFHIRDatastore.attrDatastoreArn],
    });

    const lambdaInvokerAPIGatewayPolicy = new PolicyStatement({
      actions: ['execute-api:Invoke'],
      resources: ['arn:aws:execute-api:' + props.env?.region + ':' + props.env?.account +':' + apiProxy.apiId + '/' + apiProxy.apiStage + '/POST/*/*'],
    });

    // 
    const lambdaParserInvoker = new Function(this, "Lambda-Parser-Invoker", {
      runtime: Runtime.PYTHON_3_9,
      handler: "lambda_function.lambda_handler",
      code: Code.fromAsset("../apps/lambda/Parser-Invoker", {
        bundling: {
          image: Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output'
          ],
        },
  }),
      environment: {
        "AHL_REGION": props.env?.region!,
        "MAPPER_REGION": props.env?.region!,
        "AHL_URL": cfnFHIRDatastore.attrDatastoreEndpoint,
        "MAPPING_URL": apiProxy.apiUrl + props.apiSuffix,
        "API_METHOD": props.apiMethod,
        "AHL_SERVICE": props.ahlService,
        "API_OPERATION": props.serviceMapperOperation

      },
      timeout: Duration.seconds(30),
      memorySize: 128,
      functionName: "Parser-Invoker"
    });



    lambdaParserInvoker.role?.attachInlinePolicy(
      new Policy(this, 'lambda-invoker-healthlake-policy', {
        statements: [lambdaInvokerHealthlakePolicy],
      }),
    );

    lambdaParserInvoker.role?.attachInlinePolicy(
      new Policy(this, 'lambda-invoker-api-gateway-policy', {
        statements: [lambdaInvokerAPIGatewayPolicy],
      }),
    );

  } // end of constructor
}
