import { GetResourcesCommand, ResourceGroupsTaggingAPIClient, TagResourcesCommand, UntagResourcesCommand } from "@aws-sdk/client-resource-groups-tagging-api";
import { client as defaultClient } from "../client.js";
import { ResourceGroupsTaggingAPIError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new ResourceGroupsTaggingAPIError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Resource Groups Tagging API ${op} failed`,e);};
export async function getResourcesByTag(key:string,value?:string,tagging:ResourceGroupsTaggingAPIClient=defaultClient){try{return (await tagging.send(new GetResourcesCommand({TagFilters:[{Key:key,Values:value?[value]:undefined}]}))).ResourceTagMappingList??[];}catch(e){fail("getResourcesByTag",e);}}
export async function tagResources(resourceARNList:string[],tags:Record<string,string>,tagging:ResourceGroupsTaggingAPIClient=defaultClient){try{return await tagging.send(new TagResourcesCommand({ResourceARNList:resourceARNList,Tags:tags}));}catch(e){fail("tagResources",e);}}
export async function untagResources(resourceARNList:string[],tagKeys:string[],tagging:ResourceGroupsTaggingAPIClient=defaultClient){try{return await tagging.send(new UntagResourcesCommand({ResourceARNList:resourceARNList,TagKeys:tagKeys}));}catch(e){fail("untagResources",e);}}
export const standardTags=(service:string,env="dev")=>({Service:service,Environment:env,ManagedBy:"floci"});
