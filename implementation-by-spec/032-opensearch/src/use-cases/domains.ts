import { CreateDomainCommand, DeleteDomainCommand, DescribeDomainCommand, ListDomainNamesCommand, OpenSearchClient } from "@aws-sdk/client-opensearch";
import { client as defaultClient } from "../client.js";
import { OpenSearchError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new OpenSearchError(e instanceof Error&&e.name?e.name:"UNKNOWN",`OpenSearch ${op} failed`,e);};
export async function createDomain(name:string,os:OpenSearchClient=defaultClient){try{return (await os.send(new CreateDomainCommand({DomainName:name,EngineVersion:"OpenSearch_2.11",ClusterConfig:{InstanceType:"t3.small.search",InstanceCount:1},EBSOptions:{EBSEnabled:true,VolumeSize:10,VolumeType:"gp3"}}))).DomainStatus;}catch(e){if(e instanceof Error&&e.name==="ResourceAlreadyExistsException")return describeDomain(name,os); fail("createDomain",e);}}
export async function describeDomain(name:string,os:OpenSearchClient=defaultClient){try{return (await os.send(new DescribeDomainCommand({DomainName:name}))).DomainStatus;}catch(e){fail("describeDomain",e);}}
export async function listDomains(os:OpenSearchClient=defaultClient){try{return (await os.send(new ListDomainNamesCommand({}))).DomainNames??[];}catch(e){fail("listDomains",e);}}
export async function deleteDomain(name:string|undefined,os:OpenSearchClient=defaultClient){if(!name)return; try{await os.send(new DeleteDomainCommand({DomainName:name}));}catch(e){if(e instanceof Error&&e.name==="ResourceNotFoundException")return; fail("deleteDomain",e);}}
export const indexMapping=(fields:Record<string,string>)=>({mappings:{properties:Object.fromEntries(Object.entries(fields).map(([k,type])=>[k,{type}]))}});
