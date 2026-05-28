import { CreateClusterCommand, DeleteClusterCommand, DescribeClusterCommand, EKSClient, ListClustersCommand } from "@aws-sdk/client-eks";
import { client as defaultClient } from "../client.js";
import { EKSError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new EKSError(e instanceof Error&&e.name?e.name:"UNKNOWN",`EKS ${op} failed`,e);};
export async function createEksCluster(name:string,subnetIds:string[],roleArn="arn:aws:iam::000000000000:role/eks",eks:EKSClient=defaultClient){try{return (await eks.send(new CreateClusterCommand({name,roleArn,resourcesVpcConfig:{subnetIds}}))).cluster;}catch(e){if(e instanceof Error&&e.name==="ResourceInUseException")return describeEksCluster(name,eks); fail("createEksCluster",e);}}
export async function describeEksCluster(name:string,eks:EKSClient=defaultClient){try{return (await eks.send(new DescribeClusterCommand({name}))).cluster;}catch(e){fail("describeEksCluster",e);}}
export async function listEksClusters(eks:EKSClient=defaultClient){try{return (await eks.send(new ListClustersCommand({}))).clusters??[];}catch(e){fail("listEksClusters",e);}}
export async function deleteEksCluster(name:string|undefined,eks:EKSClient=defaultClient){if(!name)return; try{await eks.send(new DeleteClusterCommand({name}));}catch(e){if(e instanceof Error&&e.name==="ResourceNotFoundException")return; fail("deleteEksCluster",e);}}
export const kubeconfigName=(cluster:string,region="us-east-1")=>`arn:aws:eks:${region}:000000000000:cluster/${cluster}`;
