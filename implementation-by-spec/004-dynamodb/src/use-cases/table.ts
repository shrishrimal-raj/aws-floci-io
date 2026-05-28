import {
  CreateTableCommand, DeleteItemCommand, DeleteTableCommand, DescribeTableCommand, DynamoDBClient,
  GetItemCommand, PutItemCommand, QueryCommand, ScanCommand, UpdateItemCommand, waitUntilTableExists,
  type AttributeValue
} from "@aws-sdk/client-dynamodb";
import { client as defaultClient } from "../client.js";
import { DynamoDBError } from "../errors.js";

export type Item = Record<string, AttributeValue>;
export const tableName = process.env.DYNAMODB_TABLE ?? "floci-ddb-lab";

const err = (op:string,e:unknown):never => { throw new DynamoDBError(e instanceof Error && e.name ? e.name : "UNKNOWN", `DynamoDB ${op} failed`, e); };

export async function createSingleTable(name = tableName, ddb: DynamoDBClient = defaultClient) {
  try {
    await ddb.send(new CreateTableCommand({
      TableName: name,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [{ AttributeName: "pk", AttributeType: "S" }, { AttributeName: "sk", AttributeType: "S" }, { AttributeName: "gsi1pk", AttributeType: "S" }, { AttributeName: "gsi1sk", AttributeType: "S" }],
      KeySchema: [{ AttributeName: "pk", KeyType: "HASH" }, { AttributeName: "sk", KeyType: "RANGE" }],
      GlobalSecondaryIndexes: [{ IndexName: "gsi1", KeySchema: [{ AttributeName: "gsi1pk", KeyType: "HASH" }, { AttributeName: "gsi1sk", KeyType: "RANGE" }], Projection: { ProjectionType: "ALL" } }],
      StreamSpecification: { StreamEnabled: true, StreamViewType: "NEW_AND_OLD_IMAGES" }
    }));
    await waitUntilTableExists({ client: ddb, maxWaitTime: 20 }, { TableName: name });
  } catch (e) { if (e instanceof Error && e.name === "ResourceInUseException") return; err("createSingleTable", e); }
}

export async function describeTable(name = tableName, ddb: DynamoDBClient = defaultClient) { try { return (await ddb.send(new DescribeTableCommand({ TableName: name }))).Table; } catch(e){ err("describeTable", e); } }
export async function putItem(item: Item, name = tableName, ddb: DynamoDBClient = defaultClient) { try { await ddb.send(new PutItemCommand({ TableName: name, Item: item })); } catch(e){ err("putItem", e); } }
export async function getItem(pk: string, sk: string, name = tableName, ddb: DynamoDBClient = defaultClient) { try { return (await ddb.send(new GetItemCommand({ TableName: name, Key: { pk:{S:pk}, sk:{S:sk} } }))).Item; } catch(e){ err("getItem", e); } }
export async function updateJsonPatch(pk: string, sk: string, patch: Record<string,string>, name = tableName, ddb: DynamoDBClient = defaultClient) { try { const names:Record<string,string>={}, values:Record<string,AttributeValue>={}, sets:string[]=[]; Object.entries(patch).forEach(([k,v],i)=>{names[`#n${i}`]=k; values[`:v${i}`]={S:v}; sets.push(`#n${i} = :v${i}`);}); await ddb.send(new UpdateItemCommand({ TableName:name, Key:{pk:{S:pk},sk:{S:sk}}, UpdateExpression:`SET ${sets.join(", ")}`, ExpressionAttributeNames:names, ExpressionAttributeValues:values })); } catch(e){ err("updateJsonPatch", e); } }
export async function queryByPk(pk: string, name = tableName, ddb: DynamoDBClient = defaultClient) { try { return (await ddb.send(new QueryCommand({ TableName:name, KeyConditionExpression:"pk = :pk", ExpressionAttributeValues:{":pk":{S:pk}} }))).Items ?? []; } catch(e){ err("queryByPk", e); } }
export async function queryGsi(gsi1pk: string, name = tableName, ddb: DynamoDBClient = defaultClient) { try { return (await ddb.send(new QueryCommand({ TableName:name, IndexName:"gsi1", KeyConditionExpression:"gsi1pk = :pk", ExpressionAttributeValues:{":pk":{S:gsi1pk}} }))).Items ?? []; } catch(e){ err("queryGsi", e); } }
export async function scanAll(name = tableName, ddb: DynamoDBClient = defaultClient) { try { return (await ddb.send(new ScanCommand({ TableName:name }))).Items ?? []; } catch(e){ err("scanAll", e); } }
export async function deleteItem(pk: string, sk: string, name = tableName, ddb: DynamoDBClient = defaultClient) { try { await ddb.send(new DeleteItemCommand({ TableName:name, Key:{pk:{S:pk},sk:{S:sk}} })); } catch(e){ err("deleteItem", e); } }
export async function deleteTable(name = tableName, ddb: DynamoDBClient = defaultClient) { try { await ddb.send(new DeleteTableCommand({ TableName:name })); } catch(e){ if(e instanceof Error && e.name === "ResourceNotFoundException") return; err("deleteTable", e); } }
