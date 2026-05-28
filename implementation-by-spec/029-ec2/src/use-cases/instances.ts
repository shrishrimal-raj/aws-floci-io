import { CreateSecurityGroupCommand, DeleteSecurityGroupCommand, DescribeInstancesCommand, EC2Client, RunInstancesCommand, TerminateInstancesCommand, type _InstanceType } from "@aws-sdk/client-ec2";
import { client as defaultClient } from "../client.js";
import { EC2Error } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new EC2Error(e instanceof Error&&e.name?e.name:"UNKNOWN",`EC2 ${op} failed`,e);};
export async function createSecurityGroup(name:string,description="floci lab",vpcId?:string,ec2:EC2Client=defaultClient){try{return (await ec2.send(new CreateSecurityGroupCommand({GroupName:name,Description:description,VpcId:vpcId}))).GroupId;}catch(e){fail("createSecurityGroup",e);}}
export async function runInstance(imageId="ami-1234567890abcdef0",instanceType:_InstanceType="t3.micro",ec2:EC2Client=defaultClient){try{return (await ec2.send(new RunInstancesCommand({ImageId:imageId,InstanceType:instanceType,MinCount:1,MaxCount:1}))).Instances?.[0]?.InstanceId;}catch(e){return fail("runInstance",e);}}
export async function describeInstance(instanceId:string,ec2:EC2Client=defaultClient){try{return (await ec2.send(new DescribeInstancesCommand({InstanceIds:[instanceId]}))).Reservations?.[0]?.Instances?.[0];}catch(e){fail("describeInstance",e);}}
export async function terminateInstance(instanceId:string|undefined,ec2:EC2Client=defaultClient){if(!instanceId)return; try{await ec2.send(new TerminateInstancesCommand({InstanceIds:[instanceId]}));}catch(e){fail("terminateInstance",e);}}
export async function deleteSecurityGroup(groupId:string|undefined,ec2:EC2Client=defaultClient){if(!groupId)return; try{await ec2.send(new DeleteSecurityGroupCommand({GroupId:groupId}));}catch(e){if(e instanceof Error&&e.name==="InvalidGroup.NotFound")return; fail("deleteSecurityGroup",e);}}
export const userData=(script:string)=>Buffer.from(script).toString("base64");
