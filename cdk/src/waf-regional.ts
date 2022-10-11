// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/*
Purpose

The WafRegionalStack class is responsible for the definition of the WAF 

*/
import { CfnOutput, NestedStack, NestedStackProps, Tags } from 'aws-cdk-lib';
import { CfnRuleGroup, CfnWebACL } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

type listOfRules = {
    name: string;
    priority: number;
    overrideAction: string;
    excludedRules: string[];
};

/**
 * Creates web application firewall rules that can be attached to API gateway
 */
export class WafRegionalStack extends NestedStack {

    public readonly wafAcl: CfnWebACL;

    /**
     * Take in list of rules
     * Create output for use in WAF config
     */
    protected makeRules(listOfRules: listOfRules[] = []) {
        var rules: CfnWebACL.RuleProperty[] = [];

        for (const r of listOfRules) {
            var stateProp: CfnWebACL.StatementProperty = {
                managedRuleGroupStatement: {
                    name: r['name'],
                    vendorName: "AWS",
                }
            };
            var overrideAction: CfnWebACL.OverrideActionProperty = { none: {} }

            var rule: CfnWebACL.RuleProperty = {
                name: r['name'],
                priority: r['priority'],
                overrideAction: overrideAction,
                statement: stateProp,
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: r['name']
                },
            };
            rules.push(rule);
        };

        return rules;
    } // function makeRules


    constructor(scope: Construct, id: string, props?: NestedStackProps) {
        super(scope, id, props);

        /**
         * List available Managed Rule Groups using AWS CLI
         * aws wafv2 list-available-managed-rule-groups --scope REGIONAL
         */
        const managedRules: listOfRules[] = [{
            "name": "AWSManagedRulesCommonRuleSet",
            "priority": 10,
            "overrideAction": "none",
            "excludedRules": []
        }, {
            "name": "AWSManagedRulesAmazonIpReputationList",
            "priority": 20,
            "overrideAction": "none",
            "excludedRules": []
        }, {
            "name": "AWSManagedRulesKnownBadInputsRuleSet",
            "priority": 30,
            "overrideAction": "none",
            "excludedRules": []
        }, {
            "name": "AWSManagedRulesAnonymousIpList",
            "priority": 40,
            "overrideAction": "none",
            "excludedRules": []
        }, {
            "name": "AWSManagedRulesLinuxRuleSet",
            "priority": 50,
            "overrideAction": "none",
            "excludedRules": []
        }, {
            "name": "AWSManagedRulesUnixRuleSet",
            "priority": 60,
            "overrideAction": "none",
            "excludedRules": [],
        }];


        // WAF - Regional, for use in Load Balancers
        this.wafAcl = new CfnWebACL(this, "WafRegional", {
            defaultAction: { allow: {} },
            /**
             * The scope of this Web ACL.
             * Valid options: CLOUDFRONT, REGIONAL.
             * For CLOUDFRONT, you must create your WAFv2 resources
             * in the US East (N. Virginia) Region, us-east-1
             */
            scope: "REGIONAL",
            // Defines and enables Amazon CloudWatch metrics and web request sample collection.
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                metricName: "waf-regional",
                sampledRequestsEnabled: true
            },
            description: "WAFv2 ACL for Regional",
            name: "waf-regional",
            rules: this.makeRules(managedRules),
        }); // CfnWebACL

        Tags.of(this.wafAcl).add("Name", "waf-Regional", { "priority": 300 });
        Tags.of(this.wafAcl).add("Purpose", "Regional", { "priority": 300 });
        Tags.of(this.wafAcl).add("CreatedBy", "CDK", { "priority": 300 });

        new CfnOutput(this, "wafAclRegionalArn", { value: this.wafAcl.attrArn });
    } // constructor
} // class
