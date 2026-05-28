#!/usr/bin/env tsx
import { DeleteTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { awsDefaults } from "@floci-lab/aws-clients";
const tableName = process.env.DDB_STREAMS_TABLE ?? "floci-ddb-streams-lab";
const ddb = new DynamoDBClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
try { await ddb.send(new DeleteTableCommand({ TableName: tableName })); } catch(e){ if(!(e instanceof Error && e.name==="ResourceNotFoundException")) throw e; }
console.log(`Cleanup DynamoDB Streams table ${tableName}`);
