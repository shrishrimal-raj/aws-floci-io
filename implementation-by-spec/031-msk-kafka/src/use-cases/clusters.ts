import { CreateClusterCommand, DeleteClusterCommand, DescribeClusterCommand, KafkaClient, ListClustersCommand } from "@aws-sdk/client-kafka";
import { client as defaultClient } from "../client.js";
import { MSKKafkaError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new MSKKafkaError(e instanceof Error&&e.name?e.name:"UNKNOWN",`MSK Kafka ${op} failed`,e);};
export async function createMskCluster(name:string,subnetIds:string[],securityGroupIds:string[],kafka:KafkaClient=defaultClient){try{return (await kafka.send(new CreateClusterCommand({ClusterName:name,KafkaVersion:"3.6.0",NumberOfBrokerNodes:2,BrokerNodeGroupInfo:{ClientSubnets:subnetIds,SecurityGroups:securityGroupIds,InstanceType:"kafka.t3.small"}}))).ClusterArn;}catch(e){fail("createMskCluster",e);}}
export async function describeMskCluster(clusterArn:string,kafka:KafkaClient=defaultClient){try{return (await kafka.send(new DescribeClusterCommand({ClusterArn:clusterArn}))).ClusterInfo;}catch(e){fail("describeMskCluster",e);}}
export async function listMskClusters(kafka:KafkaClient=defaultClient){try{return (await kafka.send(new ListClustersCommand({}))).ClusterInfoList??[];}catch(e){fail("listMskClusters",e);}}
export async function deleteMskCluster(clusterArn:string|undefined,kafka:KafkaClient=defaultClient){if(!clusterArn)return; try{await kafka.send(new DeleteClusterCommand({ClusterArn:clusterArn}));}catch(e){if(e instanceof Error&&e.name==="NotFoundException")return; fail("deleteMskCluster",e);}}
export const kafkaBootstrapUrl=(brokers:string[])=>brokers.join(",");
