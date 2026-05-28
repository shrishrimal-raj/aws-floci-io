import { ChangeResourceRecordSetsCommand, CreateHostedZoneCommand, DeleteHostedZoneCommand, ListHostedZonesCommand, Route53Client } from "@aws-sdk/client-route-53";
import { client as defaultClient } from "../client.js";
import { Route53Error } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new Route53Error(e instanceof Error&&e.name?e.name:"UNKNOWN",`Route53 ${op} failed`,e);};
export async function createHostedZone(domain:string,r53:Route53Client=defaultClient){try{return (await r53.send(new CreateHostedZoneCommand({Name:domain,CallerReference:`floci-${Date.now()}`}))).HostedZone;}catch(e){fail("createHostedZone",e);}}
export async function upsertARecord(hostedZoneId:string,name:string,values:string[],ttl=60,r53:Route53Client=defaultClient){try{return await r53.send(new ChangeResourceRecordSetsCommand({HostedZoneId:hostedZoneId,ChangeBatch:{Changes:[{Action:"UPSERT",ResourceRecordSet:{Name:name,Type:"A",TTL:ttl,ResourceRecords:values.map(Value=>({Value}))}}]}}));}catch(e){fail("upsertARecord",e);}}
export async function listHostedZones(r53:Route53Client=defaultClient){try{return (await r53.send(new ListHostedZonesCommand({}))).HostedZones??[];}catch(e){fail("listHostedZones",e);}}
export async function deleteHostedZone(id:string|undefined,r53:Route53Client=defaultClient){if(!id)return; try{await r53.send(new DeleteHostedZoneCommand({Id:id}));}catch(e){fail("deleteHostedZone",e);}}
export const fqdn=(name:string,zone:string)=>`${name.replace(/\.$/,"")}.${zone.replace(/^\./,"").replace(/\.$/,"")}.`;
