import { CreateCacheClusterCommand, DeleteCacheClusterCommand, DescribeCacheClustersCommand, ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { client as defaultClient } from "../client.js";
import { ElastiCacheRedisError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new ElastiCacheRedisError(e instanceof Error&&e.name?e.name:"UNKNOWN",`ElastiCache Redis ${op} failed`,e);};
export async function createRedisCluster(id:string,nodes=1,ec:ElastiCacheClient=defaultClient){try{return await ec.send(new CreateCacheClusterCommand({CacheClusterId:id,Engine:"redis",CacheNodeType:"cache.t4g.micro",NumCacheNodes:nodes}));}catch(e){if(e instanceof Error&&e.name==="CacheClusterAlreadyExists")return describeRedisCluster(id,ec); fail("createRedisCluster",e);}}
export async function describeRedisCluster(id:string,ec:ElastiCacheClient=defaultClient){try{return (await ec.send(new DescribeCacheClustersCommand({CacheClusterId:id,ShowCacheNodeInfo:true}))).CacheClusters?.[0];}catch(e){fail("describeRedisCluster",e);}}
export async function deleteRedisCluster(id:string|undefined,ec:ElastiCacheClient=defaultClient){if(!id)return; try{await ec.send(new DeleteCacheClusterCommand({CacheClusterId:id}));}catch(e){if(e instanceof Error&&e.name==="CacheClusterNotFound")return; fail("deleteRedisCluster",e);}}
export const redisUrl=(host:string,port=6379,tls=true)=>`${tls?"rediss":"redis"}://${host}:${port}`;
export const cacheKey=(app:string,env:string,key:string)=>`${app}:${env}:${key}`;
