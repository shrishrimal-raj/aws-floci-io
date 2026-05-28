import { DeleteParameterCommand, GetParameterCommand, GetParametersByPathCommand, PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { client as defaultClient } from "../client.js";
import { SSMParameterStoreError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new SSMParameterStoreError(e instanceof Error&&e.name?e.name:"UNKNOWN",`SSM Parameter Store ${op} failed`,e);};
export async function putStringParameter(name:string,value:string,secure=false,ssm:SSMClient=defaultClient){try{await ssm.send(new PutParameterCommand({Name:name,Value:value,Type:secure?"SecureString":"String",Overwrite:true}));}catch(e){fail("putStringParameter",e);}}
export async function getStringParameter(name:string,decrypt=true,ssm:SSMClient=defaultClient){try{return (await ssm.send(new GetParameterCommand({Name:name,WithDecryption:decrypt}))).Parameter?.Value;}catch(e){fail("getStringParameter",e);}}
export async function putJsonParameter(name:string,value:unknown,secure=false,ssm:SSMClient=defaultClient){return putStringParameter(name,JSON.stringify(value),secure,ssm);}
export async function getJsonParameter<T=unknown>(name:string,ssm:SSMClient=defaultClient):Promise<T>{const v=await getStringParameter(name,true,ssm); if(!v) throw new SSMParameterStoreError("EMPTY_PARAMETER",`${name} empty`); return JSON.parse(v) as T;}
export async function getParametersByPath(path:string,recursive=true,ssm:SSMClient=defaultClient){try{return (await ssm.send(new GetParametersByPathCommand({Path:path,Recursive:recursive,WithDecryption:true}))).Parameters??[];}catch(e){fail("getParametersByPath",e);}}
export async function deleteParameter(name:string|undefined,ssm:SSMClient=defaultClient){if(!name)return; try{await ssm.send(new DeleteParameterCommand({Name:name}));}catch(e){if(e instanceof Error&&e.name==="ParameterNotFound")return; fail("deleteParameter",e);}}
export const parameterPath=(app:string,env:string,key:string)=>`/${app}/${env}/${key}`;
