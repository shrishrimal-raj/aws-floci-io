#!/usr/bin/env tsx
import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { awsDefaults } from "@floci-lab/aws-clients";
export const tableName = process.env.DDB_STREAMS_TABLE ?? "floci-ddb-streams-lab";
const ddb = new DynamoDBClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
try { await ddb.send(new CreateTableCommand({ TableName: tableName, BillingMode:"PAY_PER_REQUEST", AttributeDefinitions:[{AttributeName:"pk",AttributeType:"S"}], KeySchema:[{AttributeName:"pk",KeyType:"HASH"}], StreamSpecification:{StreamEnabled:true,StreamViewType:"NEW_AND_OLD_IMAGES"} })); } catch(e){ if(!(e instanceof Error && e.name==="ResourceInUseException")) throw e; }
console.log(`Setup DynamoDB Streams table ${tableName}`);
