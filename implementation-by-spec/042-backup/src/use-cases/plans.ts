import { BackupClient, CreateBackupPlanCommand, DeleteBackupPlanCommand, ListBackupPlansCommand, StartBackupJobCommand } from "@aws-sdk/client-backup";
import { client as defaultClient } from "../client.js";
import { AWSBackupError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new AWSBackupError(e instanceof Error&&e.name?e.name:"UNKNOWN",`AWS Backup ${op} failed`,e);};
export async function createDailyBackupPlan(name:string,vaultName="Default",backup:BackupClient=defaultClient){try{return (await backup.send(new CreateBackupPlanCommand({BackupPlan:{BackupPlanName:name,Rules:[{RuleName:"daily",TargetBackupVaultName:vaultName,ScheduleExpression:"cron(0 5 ? * * *)",Lifecycle:{DeleteAfterDays:35}}]}}))).BackupPlanId;}catch(e){fail("createDailyBackupPlan",e);}}
export async function listBackupPlans(backup:BackupClient=defaultClient){try{return (await backup.send(new ListBackupPlansCommand({}))).BackupPlansList??[];}catch(e){fail("listBackupPlans",e);}}
export async function startBackupJob(resourceArn:string,vaultName="Default",iamRoleArn="arn:aws:iam::000000000000:role/backup",backup:BackupClient=defaultClient){try{return (await backup.send(new StartBackupJobCommand({ResourceArn:resourceArn,BackupVaultName:vaultName,IamRoleArn:iamRoleArn}))).BackupJobId;}catch(e){fail("startBackupJob",e);}}
export async function deleteBackupPlan(planId:string|undefined,backup:BackupClient=defaultClient){if(!planId)return; try{await backup.send(new DeleteBackupPlanCommand({BackupPlanId:planId}));}catch(e){fail("deleteBackupPlan",e);}}
export const retentionRule=(days:number)=>({Lifecycle:{DeleteAfterDays:days}});
