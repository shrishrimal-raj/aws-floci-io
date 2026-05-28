import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { client as defaultClient } from "../client.js";
import { BedrockRuntimeError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new BedrockRuntimeError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Bedrock Runtime ${op} failed`,e);};
export function claudeMessagesBody(prompt:string,maxTokens=512){return {anthropic_version:"bedrock-2023-05-31",max_tokens:maxTokens,messages:[{role:"user",content:[{type:"text",text:prompt}]}]};}
export async function invokeJsonModel<T=unknown>(modelId:string,body:unknown,br:BedrockRuntimeClient=defaultClient):Promise<T>{try{const r=await br.send(new InvokeModelCommand({modelId,contentType:"application/json",accept:"application/json",body:new TextEncoder().encode(JSON.stringify(body))})); const text=r.body?new TextDecoder().decode(r.body):"{}"; return JSON.parse(text) as T;}catch(e){return fail("invokeJsonModel",e);}}
export async function invokeClaude(prompt:string,modelId="anthropic.claude-3-haiku-20240307-v1:0",br:BedrockRuntimeClient=defaultClient){return invokeJsonModel(modelId,claudeMessagesBody(prompt),br);}
