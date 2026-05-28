import { CreateLoadBalancerCommand, CreateTargetGroupCommand, DeleteLoadBalancerCommand, DeleteTargetGroupCommand, ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { client as defaultClient } from "../client.js";
import { ELBv2ALBNLBError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new ELBv2ALBNLBError(e instanceof Error&&e.name?e.name:"UNKNOWN",`ELBv2 ${op} failed`,e);};
export async function createApplicationLoadBalancer(name:string,subnets:string[],securityGroups:string[],elb:ElasticLoadBalancingV2Client=defaultClient){try{return (await elb.send(new CreateLoadBalancerCommand({Name:name,Subnets:subnets,SecurityGroups:securityGroups,Type:"application",Scheme:"internet-facing"}))).LoadBalancers?.[0];}catch(e){fail("createApplicationLoadBalancer",e);}}
export async function createTargetGroup(name:string,vpcId:string,port=80,elb:ElasticLoadBalancingV2Client=defaultClient){try{return (await elb.send(new CreateTargetGroupCommand({Name:name,VpcId:vpcId,Port:port,Protocol:"HTTP",TargetType:"ip",HealthCheckPath:"/health"}))).TargetGroups?.[0];}catch(e){fail("createTargetGroup",e);}}
export async function deleteLoadBalancer(arn:string|undefined,elb:ElasticLoadBalancingV2Client=defaultClient){if(!arn)return; try{await elb.send(new DeleteLoadBalancerCommand({LoadBalancerArn:arn}));}catch(e){fail("deleteLoadBalancer",e);}}
export async function deleteTargetGroup(arn:string|undefined,elb:ElasticLoadBalancingV2Client=defaultClient){if(!arn)return; try{await elb.send(new DeleteTargetGroupCommand({TargetGroupArn:arn}));}catch(e){fail("deleteTargetGroup",e);}}
export const listenerRulePath=(path:string)=>({Field:"path-pattern",Values:[path]});
