import { CodeDeployClient, CreateApplicationCommand, CreateDeploymentCommand, CreateDeploymentGroupCommand, DeleteApplicationCommand } from "@aws-sdk/client-codedeploy";
import { client as defaultClient } from "../client.js";
import { CodeDeployError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new CodeDeployError(e instanceof Error&&e.name?e.name:"UNKNOWN",`CodeDeploy ${op} failed`,e);};
export async function createApplication(name:string,cd:CodeDeployClient=defaultClient){try{return (await cd.send(new CreateApplicationCommand({applicationName:name,computePlatform:"Server"}))).applicationId;}catch(e){fail("createApplication",e);}}
export async function createDeploymentGroup(applicationName:string,groupName:string,serviceRoleArn="arn:aws:iam::000000000000:role/codedeploy",cd:CodeDeployClient=defaultClient){try{return (await cd.send(new CreateDeploymentGroupCommand({applicationName,deploymentGroupName:groupName,serviceRoleArn}))).deploymentGroupId;}catch(e){fail("createDeploymentGroup",e);}}
export async function createDeployment(applicationName:string,groupName:string,bucket:string,key:string,cd:CodeDeployClient=defaultClient){try{return (await cd.send(new CreateDeploymentCommand({applicationName,deploymentGroupName:groupName,revision:{revisionType:"S3",s3Location:{bucket,key,bundleType:"zip"}}}))).deploymentId;}catch(e){fail("createDeployment",e);}}
export async function deleteApplication(name:string|undefined,cd:CodeDeployClient=defaultClient){if(!name)return; try{await cd.send(new DeleteApplicationCommand({applicationName:name}));}catch(e){fail("deleteApplication",e);}}
export const appspec=(files:{source:string;destination:string}[])=>JSON.stringify({version:0,os:"linux",files});
