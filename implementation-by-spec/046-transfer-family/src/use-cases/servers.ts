import { CreateServerCommand, CreateUserCommand, DeleteServerCommand, DeleteUserCommand, DescribeServerCommand, TransferClient } from "@aws-sdk/client-transfer";
import { client as defaultClient } from "../client.js";
import { TransferFamilyError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new TransferFamilyError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Transfer Family ${op} failed`,e);};
export async function createSftpServer(role="arn:aws:iam::000000000000:role/transfer",transfer:TransferClient=defaultClient){try{return (await transfer.send(new CreateServerCommand({Protocols:["SFTP"],IdentityProviderType:"SERVICE_MANAGED",LoggingRole:role}))).ServerId!;}catch(e){fail("createSftpServer",e);}}
export async function describeServer(serverId:string,transfer:TransferClient=defaultClient){try{return (await transfer.send(new DescribeServerCommand({ServerId:serverId}))).Server;}catch(e){fail("describeServer",e);}}
export async function createSftpUser(serverId:string,userName:string,homeDirectory:string,role="arn:aws:iam::000000000000:role/transfer-user",transfer:TransferClient=defaultClient){try{await transfer.send(new CreateUserCommand({ServerId:serverId,UserName:userName,HomeDirectory:homeDirectory,Role:role}));}catch(e){fail("createSftpUser",e);}}
export async function deleteSftpUser(serverId:string,userName:string,transfer:TransferClient=defaultClient){try{await transfer.send(new DeleteUserCommand({ServerId:serverId,UserName:userName}));}catch(e){fail("deleteSftpUser",e);}}
export async function deleteServer(serverId:string|undefined,transfer:TransferClient=defaultClient){if(!serverId)return; try{await transfer.send(new DeleteServerCommand({ServerId:serverId}));}catch(e){fail("deleteServer",e);}}
export const s3Home=(bucket:string,prefix:string)=>`/${bucket}/${prefix.replace(/^\/+/,"")}`;
