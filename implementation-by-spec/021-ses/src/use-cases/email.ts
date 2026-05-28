import { DeleteIdentityCommand, SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from "@aws-sdk/client-ses";
import { client as defaultClient } from "../client.js";
import { SESError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new SESError(e instanceof Error&&e.name?e.name:"UNKNOWN",`SES ${op} failed`,e);};
export async function verifyEmail(email:string,ses:SESClient=defaultClient){try{await ses.send(new VerifyEmailIdentityCommand({EmailAddress:email}));}catch(e){fail("verifyEmail",e);}}
export async function sendTextEmail(from:string,to:string[],subject:string,text:string,ses:SESClient=defaultClient){try{return (await ses.send(new SendEmailCommand({Source:from,Destination:{ToAddresses:to},Message:{Subject:{Data:subject},Body:{Text:{Data:text}}}}))).MessageId;}catch(e){fail("sendTextEmail",e);}}
export async function sendHtmlEmail(from:string,to:string[],subject:string,html:string,text="",ses:SESClient=defaultClient){try{return (await ses.send(new SendEmailCommand({Source:from,Destination:{ToAddresses:to},Message:{Subject:{Data:subject},Body:{Html:{Data:html},Text:{Data:text}}}}))).MessageId;}catch(e){fail("sendHtmlEmail",e);}}
export async function deleteIdentity(identity:string|undefined,ses:SESClient=defaultClient){if(!identity)return; try{await ses.send(new DeleteIdentityCommand({Identity:identity}));}catch(e){fail("deleteIdentity",e);}}
export const template=(name:string,data:Record<string,string>)=>Object.entries(data).reduce((s,[k,v])=>s.replaceAll(`{{${k}}}`,v),name);
