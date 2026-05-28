import { CreateScheduleCommand, DeleteScheduleCommand, GetScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { client as defaultClient } from "../client.js";
import { EventBridgeSchedulerError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new EventBridgeSchedulerError(e instanceof Error&&e.name?e.name:"UNKNOWN",`EventBridge Scheduler ${op} failed`,e);};
export interface ScheduleTarget{arn:string;roleArn:string;input?:unknown;}
export async function createRateSchedule(name:string,rateExpression:string,target:ScheduleTarget,scheduler:SchedulerClient=defaultClient){try{return await scheduler.send(new CreateScheduleCommand({Name:name,ScheduleExpression:rateExpression,FlexibleTimeWindow:{Mode:"OFF"},Target:{Arn:target.arn,RoleArn:target.roleArn,Input:target.input?JSON.stringify(target.input):undefined}}));}catch(e){fail("createRateSchedule",e);}}
export async function createOneTimeSchedule(name:string,atIso:string,target:ScheduleTarget,scheduler:SchedulerClient=defaultClient){return createRateSchedule(name,`at(${atIso.replace(/Z$/,"")})`,target,scheduler);}
export async function getSchedule(name:string,scheduler:SchedulerClient=defaultClient){try{return await scheduler.send(new GetScheduleCommand({Name:name}));}catch(e){fail("getSchedule",e);}}
export async function deleteSchedule(name:string|undefined,scheduler:SchedulerClient=defaultClient){if(!name)return; try{await scheduler.send(new DeleteScheduleCommand({Name:name}));}catch(e){if(e instanceof Error&&e.name==="ResourceNotFoundException")return; fail("deleteSchedule",e);}}
export const everyMinutes=(n:number)=>`rate(${n} minutes)`;
