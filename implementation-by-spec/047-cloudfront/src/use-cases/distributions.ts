import { CloudFrontClient, CreateInvalidationCommand, GetDistributionCommand } from "@aws-sdk/client-cloudfront";
import { client as defaultClient } from "../client.js";
import { CloudFrontError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new CloudFrontError(e instanceof Error&&e.name?e.name:"UNKNOWN",`CloudFront ${op} failed`,e);};
export async function getDistribution(id:string,cf:CloudFrontClient=defaultClient){try{return (await cf.send(new GetDistributionCommand({Id:id}))).Distribution;}catch(e){fail("getDistribution",e);}}
export async function invalidatePaths(distributionId:string,paths:string[],cf:CloudFrontClient=defaultClient){try{return (await cf.send(new CreateInvalidationCommand({DistributionId:distributionId,InvalidationBatch:{CallerReference:`floci-${Date.now()}`,Paths:{Quantity:paths.length,Items:paths}}}))).Invalidation;}catch(e){fail("invalidatePaths",e);}}
export function s3OriginConfig(bucketDomainName:string){return {DomainName:bucketDomainName,OriginPath:"",CustomHeaders:{Quantity:0},S3OriginConfig:{OriginAccessIdentity:""}};}
export function cacheBehavior(pathPattern:string,targetOriginId:string){return {PathPattern:pathPattern,TargetOriginId:targetOriginId,ViewerProtocolPolicy:"redirect-to-https",AllowedMethods:{Quantity:2,Items:["GET","HEAD"],CachedMethods:{Quantity:2,Items:["GET","HEAD"]}}};}
