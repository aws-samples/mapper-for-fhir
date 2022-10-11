# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

"""
Purpose

When configured as an AWS SQS destination, this Python AWS Lambda function pops 
incoming HL7 messages from an AWS SQS queue and parses them into a JSON object. 
It parses Segments, Elements and Fields. Component, sub components and repetition 
functionality is not currently supported.

"""

import os
import re
import json
import boto3
import requests
from hl7apy.parser import parse_message
from hl7apy.core import Segment
from requests_auth_aws_sigv4 import AWSSigV4


#create boto3 clients to interact with other AWS services and initialize environment variables

client          = boto3.client('lambda')
sqs_client      = boto3.client("sqs")
hl_client       = boto3.client("healthlake")
regionAHL       = os.environ.get('AHL_REGION')
regionMapper    = os.environ.get('MAPPER_REGION')
url             = os.environ['MAPPING_URL']
endpoint        = os.environ.get('AHL_URL')
method          = os.environ.get('API_METHOD')
service         = os.environ.get('AHL_SERVICE')
serviceMapper   = os.environ.get('API_OPERATION')
host            = hl_client.meta.endpoint_url.replace('https://','',1)
content_type    = 'application/json'
access_key      = os.environ.get('AWS_ACCESS_KEY_ID')
secret_key      = os.environ.get('AWS_SECRET_ACCESS_KEY')
session_token   = os.environ.get('AWS_SESSION_TOKEN')

#The regions where the lambda functions and the Amazon Healthlake datastore are deployed can technically be different.
session = boto3.session.Session(region_name=regionAHL)
sessionMapper = boto3.session.Session(region_name=regionMapper)

auth = AWSSigV4(service, session=session)
authMapper = AWSSigV4(serviceMapper, session=sessionMapper)

#main function invoked by lambda
def lambda_handler(event, context):
    
    principal = event.get("requestContext", {}).get("identity", {}).get("userArn", "unknown")
    
    #HL7 segments that will be parsed into JSON
    scopedSegments = ['MSH','EVN','PID','PV1','PD1','OBX']
    
    charset = "UTF-8"
    
    #parse incoming HL7 message and create a JSON object
    for record in event['Records']:
        
        if principal=='unknown':
            principal = record.get("eventSourceARN","unknown")
        
        msg = parse_message(record["body"].replace('\n', '\r').replace('^^','^""^'))

        parsedJsonMessage = {}
        for segment in msg.children:
            if isinstance(segment, Segment):
                if segment.name in scopedSegments:
                    for field in segment.children:
                            index=0
                            for element in field.children:
                                    if element.value != '""':
                                        parsedJsonMessage[field.name+'_'+str(index)] = element.value.replace('\\F\\','|').replace('\\S\\','^').replace('\\R\\','~').replace('\\E\\','').replace('\\T\\','&')
                                    index=index+1
        

        #instantiate data needed for metadata
        msgId               = parsedJsonMessage.get("MSH_10_0","")
        patLastName         = parsedJsonMessage.get("PID_5_0","")
        patFirstName        = parsedJsonMessage.get("PID_5_1","")
        eventType           = parsedJsonMessage.get("EVN_1_0","")
        facility            = parsedJsonMessage.get("MSH_6_0","")
        providerLastName    = parsedJsonMessage.get("PD1_4_1","")
        providerFirstName   = parsedJsonMessage.get("PD1_4_2","")
        providerEmail       = parsedJsonMessage.get("PD1_4_0","")
        patAddressLine      = parsedJsonMessage.get("PID_11_0","")
        patAddressCity      = parsedJsonMessage.get("PID_11_2","")
        patAddressProvince  = parsedJsonMessage.get("PID_11_3","")
        patAddressPostal    = parsedJsonMessage.get("PID_11_4","")
        admissionNotes      = parsedJsonMessage.get("OBX_5_0","")
        
        print(f"Facility {facility} and user {principal} issued the following Hl7 message {msgId} for patient {patLastName}")
        
        #perform translation from HL7v2 ORU to a FHIR Bundle
        response = invokeMapper(record["body"].replace('\r', '\r\n'),msgId,principal)
        #store FHIR Bundle in Amazon HealthLake
        responseFhir = invokeHealthlake(json.dumps(response.get("fhirResource")),msgId,principal)

        
        
        
def invokeMapper(hl7Payload,msgId,principal):
    
    try:
    
        print(f"User {principal} invoking endpoint {url} for Hl7 message {msgId}")
    
        header = {"Content-type": "text/plain", "Accept": "application/json"} 
        
        response_decoded_json = requests.post(url, data=hl7Payload, headers=header,auth=authMapper)
        response_json = response_decoded_json.json()
    
        print(f"Invocation for HL7 message {msgId} resulted in HTTP status {response_decoded_json.status_code}")
        
        if re.match(r"2[0-9][0-9]", str(response_decoded_json.status_code)):
            return response_json
        else:
            print(f"Invocation of mapping function failed with HTTP code {str(response_decoded_json.status_code)}")
            raise ValueError(f"Invocation of mapping function failed with HTTP code {str(response_decoded_json.status_code)}")
        
    except Exception as err:
        #Consider implementing custom Amazon CloudWatch metrics to record specific application errors. 
        #You can view statistical graphs and trigger alerts for your published metrics with the AWS Management Console. 
        
        print(f"Invocation of mapping function at {url} raised unexpected exception {str(err)}")
        raise

def invokeHealthlake(fhirBundle,msgId,principal):
    
    try: 
    
        print(f"User {principal} invoking endpoint {endpoint} for Hl7 message {msgId}")
        
        headers = {
            'Content-Type': content_type,
            'Accept': '*/*',
            'Host': host,
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Content-Length': str(utf8len(fhirBundle))
        }
        
        r = requests.post(endpoint, data=fhirBundle, auth=auth, headers=headers)
    
        print(f"Invocation for HL7 message {msgId} resulted in HTTP status {r.status_code}")
        
        if re.match(r"2[0-9][0-9]", str(r.status_code)):
            return r
        else:
            print(f"Invocation of Amazon Healthlake endpoint at {endpoint} failed with HTTP code {str(r.status_code)}")
            raise ValueError(f"Invocation of Amazon Healthlake endpoint at {endpoint} failed with HTTP code {str(r.status_code)}")
    
    except Exception as err:
        #Consider implementing custom Amazon CloudWatch metrics to record specific application errors. 
        #You can view statistical graphs and trigger alerts for your published metrics with the AWS Management Console. 
        
        print(f"Invocation of Amazon Healthlake endpoint at {endpoint} raised unexpected exception {str(err)}")
        raise
    
def utf8len(s):
    return len(s.encode('utf-8'))
