//Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
//SPDX-License-Identifier: Apache-2.0

/*
Purpose

The RestAPIProxy class is responsible for the definition of the API Gateway

*/

import { NestedStack, Stack } from 'aws-cdk-lib';
import { AuthorizationType, Cors, EndpointType, LambdaIntegration, MethodLoggingLevel, MethodOptions, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AllowedMethods } from 'aws-cdk-lib/aws-cloudfront';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { CfnWebACLAssociation } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
import { WafRegionalStack } from './waf-regional';

/**
 * The nested stack deploys an API gateway rest api endpoint that proxies all request to the backend lambda function
 */
export class RestAPIProxy extends NestedStack {
  public readonly apiDomain: string;
  public readonly restApiArn: string;
  public readonly apiUrl: string;
  public readonly apiId: string;
  public readonly apiStage: string;

  constructor(scope: Construct, id: string, wafRegional: WafRegionalStack, environment: string, expressRestApiFunction: Function) {
    super(scope, id);

    // Create API gateway
    const restApi = new RestApi(this, 'RestApi', {
      endpointTypes: [EndpointType.REGIONAL],
      deploy: true,
      deployOptions: {
        stageName: environment,
        tracingEnabled: true,
        loggingLevel: MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowMethods: AllowedMethods.ALLOW_ALL.methods,
        allowCredentials: true,
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    this.restApiArn = `arn:aws:apigateway:${Stack.of(this).region}::/restapis/${restApi.restApiId}/stages/${restApi.deploymentStage.stageName}`;
    // WAF association to API Gateway
    new CfnWebACLAssociation(this, 'MyCfnWebACLAssociation', {
      resourceArn: this.restApiArn,
      webAclArn: wafRegional.wafAcl.attrArn,
    });

    // Properties used by all APIs to attach IAM authorizer to the methods
    const methodOptions: MethodOptions = {
      authorizationType: AuthorizationType.IAM,
    };

    // Create a lambda integration
    const integration = new LambdaIntegration(expressRestApiFunction, {
      proxy: true
    });

    // Create a proxy rest api endpoint
    const rootResource = restApi.root;
    rootResource.addMethod("ANY", integration);
    rootResource.addResource("{proxy+}").addMethod("ANY", integration, methodOptions);

    this.apiUrl = restApi.url;
    this.apiId = restApi.restApiId;
    this.apiStage = restApi.deploymentStage.stageName;

  } // end of constructor

}
