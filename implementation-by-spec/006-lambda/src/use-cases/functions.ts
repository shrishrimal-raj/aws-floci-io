import { CreateFunctionCommand, DeleteFunctionCommand, GetFunctionCommand, InvokeCommand, LambdaClient, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda";
import { client as defaultClient } from "../client.js";
import { LambdaError } from "../errors.js";

export interface FunctionSpec { name:string; handler?:string; runtime?:"nodejs18.x"|"nodejs20.x"; roleArn?:string; codeZip?:Uint8Array; environment?:Record<string,string>; timeoutSeconds?:number; memoryMb?:number; }
const err=(op:string,e:unknown):never=>{throw new LambdaError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Lambda ${op} failed`,e);};
export const defaultZip = new Uint8Array([80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);

export async function createFunction(spec:FunctionSpec, lambda:LambdaClient=defaultClient){try{return await lambda.send(new CreateFunctionCommand({ FunctionName:spec.name, Runtime:spec.runtime??"nodejs20.x", Handler:spec.handler??"index.handler", Role:spec.roleArn??"arn:aws:iam::000000000000:role/lambda-role", Code:{ZipFile:spec.codeZip??defaultZip}, Environment: spec.environment ? { Variables: spec.environment } : undefined, Timeout: spec.timeoutSeconds??10, MemorySize: spec.memoryMb??128 }));}catch(e){if(e instanceof Error&&e.name==="ResourceConflictException") return getFunction(spec.name,lambda); err("createFunction",e);}}
export async function getFunction(name:string, lambda:LambdaClient=defaultClient){try{return await lambda.send(new GetFunctionCommand({FunctionName:name}));}catch(e){err("getFunction",e);}}
export async function updateFunctionCode(name:string, zip:Uint8Array=defaultZip, lambda:LambdaClient=defaultClient){try{return await lambda.send(new UpdateFunctionCodeCommand({FunctionName:name,ZipFile:zip}));}catch(e){err("updateFunctionCode",e);}}
export async function invokeJson<T=unknown>(name:string, payload:unknown={}, lambda:LambdaClient=defaultClient):Promise<T>{try{const res=await lambda.send(new InvokeCommand({FunctionName:name,Payload:new TextEncoder().encode(JSON.stringify(payload))})); const text=res.Payload?new TextDecoder().decode(res.Payload):"null"; return JSON.parse(text) as T;}catch(e){return err("invokeJson",e);}}
export async function deleteFunction(name:string|undefined, lambda:LambdaClient=defaultClient){if(!name)return; try{await lambda.send(new DeleteFunctionCommand({FunctionName:name}));}catch(e){if(e instanceof Error&&e.name==="ResourceNotFoundException")return; err("deleteFunction",e);}}
export function handlerResponse(statusCode:number, body:unknown){return { statusCode, headers:{"content-type":"application/json"}, body:JSON.stringify(body) };}
