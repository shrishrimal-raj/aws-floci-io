import { CreatePipeCommand, DeletePipeCommand, DescribePipeCommand, PipesClient, StartPipeCommand, StopPipeCommand } from "@aws-sdk/client-pipes";
import { client as defaultClient } from "../client.js";
import { EventBridgePipesError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new EventBridgePipesError(e instanceof Error&&e.name?e.name:"UNKNOWN",`EventBridge Pipes ${op} failed`,e);};
export interface PipeSpec{name:string;sourceArn:string;targetArn:string;roleArn:string;filterPattern?:Record<string,unknown>;}
export async function createPipe(spec:PipeSpec,pipes:PipesClient=defaultClient){try{return await pipes.send(new CreatePipeCommand({Name:spec.name,Source:spec.sourceArn,Target:spec.targetArn,RoleArn:spec.roleArn,SourceParameters:spec.filterPattern?{FilterCriteria:{Filters:[{Pattern:JSON.stringify(spec.filterPattern)}]}}:undefined}));}catch(e){fail("createPipe",e);}}
export async function describePipe(name:string,pipes:PipesClient=defaultClient){try{return await pipes.send(new DescribePipeCommand({Name:name}));}catch(e){fail("describePipe",e);}}
export async function startPipe(name:string,pipes:PipesClient=defaultClient){try{await pipes.send(new StartPipeCommand({Name:name}));}catch(e){fail("startPipe",e);}}
export async function stopPipe(name:string,pipes:PipesClient=defaultClient){try{await pipes.send(new StopPipeCommand({Name:name}));}catch(e){fail("stopPipe",e);}}
export async function deletePipe(name:string|undefined,pipes:PipesClient=defaultClient){if(!name)return; try{await pipes.send(new DeletePipeCommand({Name:name}));}catch(e){if(e instanceof Error&&e.name==="ResourceNotFoundException")return; fail("deletePipe",e);}}
export const sqsToEventBusFilter=(eventType:string)=>({body:{eventType:[eventType]}});
