import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { client as defaultClient } from "../client.js";
import { CostExplorerError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new CostExplorerError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Cost Explorer ${op} failed`,e);};
export async function getMonthlyCost(start:string,end:string,ce:CostExplorerClient=defaultClient){try{return (await ce.send(new GetCostAndUsageCommand({TimePeriod:{Start:start,End:end},Granularity:"MONTHLY",Metrics:["UnblendedCost"]}))).ResultsByTime??[];}catch(e){fail("getMonthlyCost",e);}}
export async function getCostByService(start:string,end:string,ce:CostExplorerClient=defaultClient){try{return (await ce.send(new GetCostAndUsageCommand({TimePeriod:{Start:start,End:end},Granularity:"MONTHLY",Metrics:["UnblendedCost"],GroupBy:[{Type:"DIMENSION",Key:"SERVICE"}]}))).ResultsByTime??[];}catch(e){fail("getCostByService",e);}}
export const monthRange=(date=new Date())=>{const s=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1)); const e=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)); return {start:s.toISOString().slice(0,10),end:e.toISOString().slice(0,10)};};
