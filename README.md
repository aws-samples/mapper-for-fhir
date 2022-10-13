# Project

This project contains assets that allow for the automated deployment of an HL7v2 to [HL7 FHIR](https://hl7.org/FHIR/) converter leveraging native AWS services.

# License

License information is available in LICENSE file in repository root directory. hl7v2.js and handlebars-helpers.js are customizations of assets bound by license files located on each of their corresponding directories.

# Deployment Instructions

This repository contains AWS CDK code to deploy an HL7v2 to FHIR serverless converter. The solution contains four main components:

1. A FHIR-Converter lambda function based on a handlebars mapping engine
2. Customized mappinig templates compatible with Amazon Healthlake
3. An API Gateway to proxy conversion requests to the FHIR-Converter
4. A Parser-Invoker lambda function to ingest HL7v2 messages, invoke the conversion and persist the converted payload in an Amazon Healthlake data store.


## Package Structure

```
fhir-mapper  Contains scripts to clean, build and deploy the cdk application
|__ apps/lambda/    Folder in which the microsoft FHIR-Converter project to be cloned to
    |__ FHIR-Converter-Overrides    Code changes to be copied into apps/lambda/FHIR-Converter
    |__ Parser-Invoker  Lambda function code to ingest HL7v2 and persist FHIR payloads in Amazon Healthlake
|__ cdk             Contains all AWS CDK code to deploy api gateway, lambda, waf etc.
```

## Deployment Steps

- Create an AWS Cloud9 environment in the same region where you are planning on deploying the rest of the components. Amazon Healthlake is currently available in the U.S. East (N. Virginia), U.S. West (Oregon), and U.S. East (Ohio) regions. Ensure the AWS Cloud9 environment is deployed on an m5.xlarge instance or larger.

- Clone this repository into your local AWS Cloud9 environment

- Install and use Node v14
```
nvm install 14
nvm use 14
```

- Clone the microsoft fhir converter handlebars engine to apps/lambda

  ```
  cd apps/lambda

  git clone -b handlebars https://github.com/microsoft/FHIR-Converter.git

  ```

- Copy and replace all files from overrides folder into the project

  ```
  cp -r FHIR-Converter-Overrides/* FHIR-Converter/
  ```

- Update "cdk.json" file
  - With your AWS account number
  - The Suffix of the API endpoint for translations (under normal operations you should not have to modify the default value)

```
"main": {
      "awsAccount": "123456789", 
      "awsRegion": "us-west-2",
      "apiSuffix": "api/convert/hl7v2/ORU_R01.hbs"
    }
```

- Deploy the application (approx. 25 minutes)

  ```
  # If this is the first time deploying run the following script
  ./bootstrap.sh

  # Deploy the application
  ./deploy.sh
  ```

## Accessing the application

The recommended way of invoking this solution is to call the Parser-Invoker lambda function to convert and persist converted HL7v2 messages into Amazon Healthlake. This can be done by susbscribing the Parser-Invoker lambda function to an AWS SQS queue that contains HL7v2 messages.

As a test, you can invoke the lambda function directly with an HL7v2 payload in the AWS Console. Sample content for a new lambda test event can be found below

When interacting with the Amazon HealthLake service, please be aware of the existing [service quotas](https://docs.aws.amazon.com/healthlake/latest/devguide/quotas.html)


```
{
"Records": [
{
"messageId": "28ec2b7d-27b0-4129-98f7-ed2cab523fee",
"body": "MSH|^~\\&|LAB|MYFAC|LAB||201411130917||ORU^R01|3216598|D|2.3|||AL|NE|\rPID|1|47893274|391287312_PID3|1238172312_ALTID|Jones^David^Michael||19670202|F|||4505 21 st^^LAKE COUNTRY^BC^V4V 2S7||222-555-8484|||||MF0050356/15|\rPV1|1|O|MYFACSOMPL||||^Xavarie^Sandie^^^^^XAVS|||||||||||REF||SELF|||||||||||||||||||MYFAC||REG|||201411071440||||||||\rORC|RE|11PT103933301.0100|||CM|N|||201411130917|^Kyle^Shondra^J.^^^^KYLA||^Xavarie^Donna^^^^^XAVS|MYFAC|\rOBR|1|11PT1311:H00001R301.0100|PT1311:H00001R|301.0100^Complete Blood Count (CBC)^https://acme.lab/resultcodes^57021-8^CBC Auto Differential^https://acme.lab/resultcodes|R||201411130914|||KYLA||||201411130914||^Xavarie^Donna^^^^^XAVS||00065227||||201411130915||LAB|F||^^^^^R|^Xavarie^Donna^^^^^XAVS|\rOBX|1|NM|301.0500^White Blood Count (WBC)^https://acme.lab/resultcodes^6690-2^Leukocytes^https://acme.lab/resultcodes|1|10.1|10\\S\\9/L^^https://acme.lab/resultcodes|3.1-9.7|H||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|2|NM|301.0600^Red Blood Count (RBC)^https://acme.lab/resultcodes^789-8^Erythrocytes^https://acme.lab/resultcodes|1|3.2|10\\S\\12/L^^https://acme.lab/resultcodes|3.7-5.0|L||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|3|NM|301.0700^Hemoglobin (HGB)^https://acme.lab/resultcodes^718-7^Hemoglobin^https://acme.lab/resultcodes|1|140|g/L^^https://acme.lab/resultcodes|118-151|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|4|NM|301.0900^Hematocrit (HCT)^https://acme.lab/resultcodes^4544-3^Hematocrit^https://acme.lab/resultcodes|1|0.34|L/L^^https://acme.lab/resultcodes|0.33-0.45|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|5|NM|301.1100^MCV^https://acme.lab/resultcodes^787-2^Mean Corpuscular Volume^https://acme.lab/resultcodes|1|98.0|fL^^https://acme.lab/resultcodes|84.0-98.0|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|6|NM|301.1300^MCH^https://acme.lab/resultcodes^785-6^Mean Corpuscular Hemoglobin^https://acme.lab/resultcodes|1|27.0|pg^^https://acme.lab/resultcodes|28.3-33.5|L||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|7|NM|301.1500^MCHC^https://acme.lab/resultcodes^786-4^Mean Corpuscular Hemoglobin Concentration^https://acme.lab/resultcodes|1|330|g/L^^https://acme.lab/resultcodes|329-352|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|8|NM|301.1700^RDW^https://acme.lab/resultcodes^788-0^Erythrocyte Distribution Width^https://acme.lab/resultcodes|1|12.0|percent^^https://acme.lab/resultcodes|12.0-15.0|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|9|NM|301.1900^Platelets^https://acme.lab/resultcodes^777-3^Platelets^https://acme.lab/resultcodes|1|125|10\\S\\9/L^^https://acme.lab/resultcodes|147-375|L||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|10|NM|301.2100^Neutrophils^https://acme.lab/resultcodes^751-8^Neutrophils^https://acme.lab/resultcodes|1|8.0|10\\S\\9/L^^https://acme.lab/resultcodes|1.2-6.0|H||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|11|NM|301.2300^Lymphocytes^https://acme.lab/resultcodes^731-0^Lymphocytes^https://acme.lab/resultcodes|1|1.0|10\\S\\9/L^^https://acme.lab/resultcodes|0.6-3.1|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|12|NM|301.2500^Monocytes^https://acme.lab/resultcodes^742-7^Monocytes^https://acme.lab/resultcodes|1|1.0|10\\S\\9/L^^https://acme.lab/resultcodes|0.1-0.9|H||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|13|NM|301.2700^Eosinophils^https://acme.lab/resultcodes^711-2^Eosinophils^https://acme.lab/resultcodes|1|0.0|10\\S\\9/L^^https://acme.lab/resultcodes|0.0-0.5|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|14|NM|301.2900^Basophils^https://acme.lab/resultcodes^704-7^Basophils^https://acme.lab/resultcodes|1|0.0|10\\S\\9/L^^https://acme.lab/resultcodes|0.0-0.2|N||A~S|F|||201411130916|MYFAC^MyFake Hospital^L|\rOBX|15|TX|CAT-ABCON^ABDOMEN W CONTRAST|15|Mr . Jones is a 55 - year - old Caucasian male with an extensive past medical history that includes coronary artery disease , atrial fibrillation , hypertension , hyperlipidemia ||||||C|\rOBX|16|TX|CAT-ABCON^ABDOMEN W CONTRAST|15| presented to North ED with complaints of chills , nausea , acute left flank pain and some numbness in his left leg.||||||C|\r\r"
}
]
}
```


