import { CodeBuildClient, CreateProjectCommand, DeleteProjectCommand, StartBuildCommand } from "@aws-sdk/client-codebuild";
import { client as defaultClient } from "../client.js";
import { CodeBuildError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new CodeBuildError(e instanceof Error&&e.name?e.name:"UNKNOWN",`CodeBuild ${op} failed`,e);};
export const buildspec=(commands:string[])=>`version: 0.2\nphases:\n  build:\n    commands:\n${commands.map(c=>`      - ${c}`).join("\n")}\n`;
export async function createProject(name:string,serviceRole="arn:aws:iam::000000000000:role/codebuild",cb:CodeBuildClient=defaultClient){try{return await cb.send(new CreateProjectCommand({name,serviceRole,artifacts:{type:"NO_ARTIFACTS"},environment:{type:"LINUX_CONTAINER",image:"aws/codebuild/standard:7.0",computeType:"BUILD_GENERAL1_SMALL"},source:{type:"NO_SOURCE",buildspec:buildspec(["echo hello"])}}));}catch(e){fail("createProject",e);}}
export async function startBuild(name:string,cb:CodeBuildClient=defaultClient){try{return (await cb.send(new StartBuildCommand({projectName:name}))).build;}catch(e){fail("startBuild",e);}}
export async function deleteProject(name:string|undefined,cb:CodeBuildClient=defaultClient){if(!name)return; try{await cb.send(new DeleteProjectCommand({name}));}catch(e){fail("deleteProject",e);}}
