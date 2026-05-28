import { ConfigServiceClient, DescribeComplianceByConfigRuleCommand, PutConfigRuleCommand } from "@aws-sdk/client-config-service";
import { client as defaultClient } from "../client.js";
import { AWSConfigError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new AWSConfigError(e instanceof Error&&e.name?e.name:"UNKNOWN",`AWS Config ${op} failed`,e);};
export async function putManagedRule(name:string,sourceIdentifier="S3_BUCKET_PUBLIC_READ_PROHIBITED",config:ConfigServiceClient=defaultClient){try{await config.send(new PutConfigRuleCommand({ConfigRule:{ConfigRuleName:name,Source:{Owner:"AWS",SourceIdentifier:sourceIdentifier}}}));}catch(e){fail("putManagedRule",e);}}
export async function describeRuleCompliance(ruleNames:string[],config:ConfigServiceClient=defaultClient){try{return (await config.send(new DescribeComplianceByConfigRuleCommand({ConfigRuleNames:ruleNames}))).ComplianceByConfigRules??[];}catch(e){fail("describeRuleCompliance",e);}}
export const requiredTagsRule=(tags:string[])=>({ConfigRuleName:"required-tags",InputParameters:JSON.stringify({tag1Key:tags[0],tag2Key:tags[1]})});
