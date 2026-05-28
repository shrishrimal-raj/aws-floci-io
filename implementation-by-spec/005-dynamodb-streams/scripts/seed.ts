#!/usr/bin/env tsx
import "./setup.js";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { awsDefaults } from "@floci-lab/aws-clients";
import { tableName } from "./setup.js";
const ddb = new DynamoDBClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
await ddb.send(new PutItemCommand({ TableName: tableName, Item:{ pk:{S:"EVENT#1"}, status:{S:"seeded"} } }));
console.log(`Seed DynamoDB Streams table ${tableName}`);
