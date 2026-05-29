import {
  CreateTableCommand,
  DeleteItemCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  waitUntilTableExists,
  type AttributeValue,
  type DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { client as defaultClient } from "../client.js";
import { DynamoDBError } from "../errors.js";

export type Item = Record<string, AttributeValue>;
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface JsonEntityInput<TValue extends Record<string, JsonValue>> {
  pk: string;
  sk: string;
  entityType: string;
  value: TValue;
  gsi1pk?: string;
  gsi1sk?: string;
}

export interface QueryPage {
  items: Item[];
  lastEvaluatedKey?: Item;
}

export interface EntityKeyInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  childType?: string;
  childId?: string;
}

export interface AuditEntityInput {
  tenantId: string;
  actorId: string;
  action: string;
  resourceId: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  traceId?: string;
  reason?: string;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export interface DynamoDbCostEstimateInput {
  readRequestUnits: number;
  writeRequestUnits: number;
  storageGb?: number;
  readUsdPerMillion?: number;
  writeUsdPerMillion?: number;
  storageUsdPerGbMonth?: number;
}

export interface DynamoDbCostEstimate {
  readUsd: number;
  writeUsd: number;
  storageUsd: number;
  totalUsd: number;
}

export const tableName = process.env.DYNAMODB_TABLE ?? "floci-ddb-lab";

function awsErrorName(error: unknown): string {
  if (error instanceof DynamoDBError && error.cause instanceof Error)
    return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new DynamoDBError(code, `DynamoDB ${operation} failed`, error);
}

function toAttribute(value: JsonValue): AttributeValue {
  if (value === null) return { NULL: true };
  if (typeof value === "string") return { S: value };
  if (typeof value === "number") return { N: String(value) };
  if (typeof value === "boolean") return { BOOL: value };
  if (Array.isArray(value)) return { L: value.map(toAttribute) };

  return {
    M: Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toAttribute(item)]),
    ),
  };
}

function fromAttribute(value: AttributeValue): JsonValue {
  if ("S" in value && value.S !== undefined) return value.S;
  if ("N" in value && value.N !== undefined) return Number(value.N);
  if ("BOOL" in value && value.BOOL !== undefined) return value.BOOL;
  if ("NULL" in value && value.NULL) return null;
  if ("L" in value && value.L) return value.L.map(fromAttribute);
  if ("M" in value && value.M) {
    return Object.fromEntries(
      Object.entries(value.M).map(([key, item]) => [key, fromAttribute(item)]),
    );
  }
  return null;
}

function entityToItem<TValue extends Record<string, JsonValue>>(
  input: JsonEntityInput<TValue>,
): Item {
  return {
    pk: { S: input.pk },
    sk: { S: input.sk },
    entityType: { S: input.entityType },
    ...Object.fromEntries(
      Object.entries(input.value).map(([key, value]) => [
        key,
        toAttribute(value),
      ]),
    ),
    ...(input.gsi1pk && { gsi1pk: { S: input.gsi1pk } }),
    ...(input.gsi1sk && { gsi1sk: { S: input.gsi1sk } }),
  };
}

function itemToJson<TValue extends Record<string, JsonValue>>(
  item: Item,
): TValue {
  const entries = Object.entries(item)
    .filter(
      ([key]) => !["pk", "sk", "entityType", "gsi1pk", "gsi1sk"].includes(key),
    )
    .map(([key, value]) => [key, fromAttribute(value)]);
  return Object.fromEntries(entries) as TValue;
}

function cleanKeyPart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._:-]+/g, "-");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultShouldRetry(error: unknown): boolean {
  const name = awsErrorName(error);
  return [
    "ProvisionedThroughputExceededException",
    "ThrottlingException",
    "RequestLimitExceeded",
    "InternalServerError",
  ].includes(name);
}

/**
 * Build tenant-scoped single-table keys for secure multi-tenant access patterns.
 *
 * @example
 * entityKeys({ tenantId: "acme", entityType: "USER", entityId: "u1" });
 */
export function entityKeys(input: EntityKeyInput): { pk: string; sk: string } {
  const tenantId = cleanKeyPart(input.tenantId);
  const entityType = cleanKeyPart(input.entityType.toUpperCase());
  const entityId = cleanKeyPart(input.entityId);
  const childType = input.childType
    ? cleanKeyPart(input.childType.toUpperCase())
    : undefined;
  const childId = input.childId ? cleanKeyPart(input.childId) : undefined;
  if (!tenantId || !entityType || !entityId)
    throw new DynamoDBError(
      "VALIDATION",
      "tenantId, entityType, and entityId are required",
    );
  return {
    pk: `TENANT#${tenantId}#${entityType}#${entityId}`,
    sk: childType && childId ? `${childType}#${childId}` : "PROFILE",
  };
}

/**
 * Build a GSI key for status/time ordered workflows.
 *
 * @example
 * statusIndexKeys("acme", "ORDER", "OPEN", "2026-05-30T00:00:00Z");
 */
export function statusIndexKeys(
  tenantId: string,
  entityType: string,
  status: string,
  isoTimestamp: string,
): { gsi1pk: string; gsi1sk: string } {
  return {
    gsi1pk: `TENANT#${cleanKeyPart(tenantId)}#${cleanKeyPart(entityType.toUpperCase())}#STATUS#${cleanKeyPart(status.toUpperCase())}`,
    gsi1sk: isoTimestamp,
  };
}

/**
 * Create immutable audit entity input for compliance-oriented tables.
 *
 * @example
 * auditEntity({ tenantId: "acme", actorId: "u1", action: "OrderRead", resourceId: "o1", outcome: "ALLOW" });
 */
export function auditEntity(
  input: AuditEntityInput,
): JsonEntityInput<Record<string, JsonValue>> {
  const timestamp = new Date().toISOString();
  return {
    pk: `TENANT#${cleanKeyPart(input.tenantId)}#AUDIT`,
    sk: `AUDIT#${timestamp}#${cleanKeyPart(input.action)}#${cleanKeyPart(input.resourceId)}`,
    entityType: "AuditEvent",
    value: {
      tenantId: input.tenantId,
      actorId: input.actorId,
      action: input.action,
      resourceId: input.resourceId,
      outcome: input.outcome,
      timestamp,
      ...(input.traceId && { traceId: input.traceId }),
      ...(input.reason && { reason: input.reason }),
    },
    gsi1pk: `AUDIT#${cleanKeyPart(input.action)}`,
    gsi1sk: timestamp,
  };
}

/**
 * Estimate DynamoDB on-demand request/storage cost for design discussions.
 * Defaults are illustrative; verify live AWS Pricing before production use.
 *
 * @example
 * estimateDynamoDbCost({ readRequestUnits: 5_000_000, writeRequestUnits: 1_000_000 });
 */
export function estimateDynamoDbCost(
  input: DynamoDbCostEstimateInput,
): DynamoDbCostEstimate {
  const readUsd =
    (input.readRequestUnits / 1_000_000) * (input.readUsdPerMillion ?? 0.25);
  const writeUsd =
    (input.writeRequestUnits / 1_000_000) * (input.writeUsdPerMillion ?? 1.25);
  const storageUsd =
    (input.storageGb ?? 0) * (input.storageUsdPerGbMonth ?? 0.25);
  return {
    readUsd,
    writeUsd,
    storageUsd,
    totalUsd: readUsd + writeUsd + storageUsd,
  };
}

/**
 * Create a pay-per-request single table with `pk/sk`, `gsi1`, and streams enabled.
 *
 * @example
 * await createSingleTable("app");
 */
export async function createSingleTable(
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  try {
    await ddb.send(
      new CreateTableCommand({
        TableName: name,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
          { AttributeName: "gsi1pk", AttributeType: "S" },
          { AttributeName: "gsi1sk", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "gsi1",
            KeySchema: [
              { AttributeName: "gsi1pk", KeyType: "HASH" },
              { AttributeName: "gsi1sk", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
        StreamSpecification: {
          StreamEnabled: true,
          StreamViewType: "NEW_AND_OLD_IMAGES",
        },
      }),
    );
    await waitUntilTableExists(
      { client: ddb, maxWaitTime: 20 },
      { TableName: name },
    );
  } catch (error) {
    if (awsErrorName(error) === "ResourceInUseException") return;
    wrapError("createSingleTable", error);
  }
}

/**
 * Describe table status, keys, indexes, and stream config.
 *
 * @example
 * const table = await describeTable("app");
 */
export async function describeTable(
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
) {
  try {
    return (await ddb.send(new DescribeTableCommand({ TableName: name })))
      .Table;
  } catch (error) {
    wrapError("describeTable", error);
  }
}

/**
 * Put a raw DynamoDB item.
 *
 * @example
 * await putItem({ pk: { S: "USER#1" }, sk: { S: "PROFILE" }, name: { S: "Ada" } }, "app");
 */
export async function putItem(
  item: Item,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  try {
    await ddb.send(new PutItemCommand({ TableName: name, Item: item }));
  } catch (error) {
    wrapError("putItem", error);
  }
}

/**
 * Put an item only when `pk/sk` does not already exist.
 *
 * @example
 * await putItemIfAbsent({ pk: { S: "USER#1" }, sk: { S: "PROFILE" } }, "app");
 */
export async function putItemIfAbsent(
  item: Item,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  try {
    await ddb.send(
      new PutItemCommand({
        TableName: name,
        Item: item,
        ConditionExpression:
          "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      }),
    );
  } catch (error) {
    wrapError("putItemIfAbsent", error);
  }
}

/**
 * Put typed JSON fields as a single-table entity.
 *
 * @example
 * await putJsonEntity({ pk: "USER#1", sk: "PROFILE", entityType: "User", value: { name: "Ada" } }, "app");
 */
export async function putJsonEntity<TValue extends Record<string, JsonValue>>(
  input: JsonEntityInput<TValue>,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  await putItem(entityToItem(input), name, ddb);
}

/**
 * Put typed JSON entity only when pk/sk does not already exist.
 *
 * @example
 * await putJsonEntityIfAbsent({ pk: "ORDER#1", sk: "META", entityType: "Order", value: { status: "OPEN" } });
 */
export async function putJsonEntityIfAbsent<
  TValue extends Record<string, JsonValue>,
>(
  input: JsonEntityInput<TValue>,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  await putItemIfAbsent(entityToItem(input), name, ddb);
}

/**
 * Get a raw item by partition and sort key.
 *
 * @example
 * const item = await getItem("USER#1", "PROFILE", "app");
 */
export async function getItem(
  pk: string,
  sk: string,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<Item | undefined> {
  try {
    return (
      await ddb.send(
        new GetItemCommand({
          TableName: name,
          Key: { pk: { S: pk }, sk: { S: sk } },
        }),
      )
    ).Item;
  } catch (error) {
    wrapError("getItem", error);
  }
}

/**
 * Get JSON fields from a single-table entity.
 *
 * @example
 * const profile = await getJsonEntity<{ name: string }>("USER#1", "PROFILE", "app");
 */
export async function getJsonEntity<TValue extends Record<string, JsonValue>>(
  pk: string,
  sk: string,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<TValue | undefined> {
  const item = await getItem(pk, sk, name, ddb);
  return item ? itemToJson<TValue>(item) : undefined;
}

/**
 * Patch string attributes with a DynamoDB update expression.
 *
 * @example
 * await updateJsonPatch("USER#1", "PROFILE", { name: "Grace" }, "app");
 */
export async function updateJsonPatch(
  pk: string,
  sk: string,
  patch: Record<string, string>,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  try {
    const names: Record<string, string> = {};
    const values: Record<string, AttributeValue> = {};
    const sets: string[] = [];

    Object.entries(patch).forEach(([key, value], index) => {
      names[`#n${index}`] = key;
      values[`:v${index}`] = { S: value };
      sets.push(`#n${index} = :v${index}`);
    });

    await ddb.send(
      new UpdateItemCommand({
        TableName: name,
        Key: { pk: { S: pk }, sk: { S: sk } },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );
  } catch (error) {
    wrapError("updateJsonPatch", error);
  }
}

/**
 * Patch string attributes with bounded retry for transient throttling/errors.
 *
 * @example
 * await updateJsonPatchWithRetry("ORDER#1", "META", { status: "PAID" });
 */
export async function updateJsonPatchWithRetry(
  pk: string,
  sk: string,
  patch: Record<string, string>,
  options: RetryOptions = {},
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await updateJsonPatch(pk, sk, patch, name, ddb);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

/**
 * Query all items for a partition key.
 *
 * @example
 * const items = await queryByPk("USER#1", "app");
 */
export async function queryByPk(
  pk: string,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<Item[]> {
  try {
    return (
      (
        await ddb.send(
          new QueryCommand({
            TableName: name,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": { S: pk } },
          }),
        )
      ).Items ?? []
    );
  } catch (error) {
    wrapError("queryByPk", error);
  }
}

/**
 * Query one page for a partition key with optional page size and cursor.
 *
 * @example
 * const page = await queryByPkPage("USER#1", 25, undefined, "app");
 */
export async function queryByPkPage(
  pk: string,
  limit = 25,
  exclusiveStartKey?: Item,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<QueryPage> {
  try {
    const result = await ddb.send(
      new QueryCommand({
        TableName: name,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": { S: pk } },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    return {
      items: result.Items ?? [],
      ...(result.LastEvaluatedKey && {
        lastEvaluatedKey: result.LastEvaluatedKey,
      }),
    };
  } catch (error) {
    wrapError("queryByPkPage", error);
  }
}

/**
 * Query all pages for a partition key. Use for jobs/admin flows, not hot request paths.
 *
 * @example
 * const orders = await queryAllByPk("USER#1");
 */
export async function queryAllByPk(
  pk: string,
  pageSize = 25,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<Item[]> {
  const items: Item[] = [];
  let cursor: Item | undefined;
  do {
    const page = await queryByPkPage(pk, pageSize, cursor, name, ddb);
    items.push(...page.items);
    cursor = page.lastEvaluatedKey;
  } while (cursor);
  return items;
}

/**
 * Query GSI1 by alternate access pattern partition key.
 *
 * @example
 * const users = await queryGsi("EMAIL#ada@example.com", "app");
 */
export async function queryGsi(
  gsi1pk: string,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<Item[]> {
  try {
    return (
      (
        await ddb.send(
          new QueryCommand({
            TableName: name,
            IndexName: "gsi1",
            KeyConditionExpression: "gsi1pk = :pk",
            ExpressionAttributeValues: { ":pk": { S: gsi1pk } },
          }),
        )
      ).Items ?? []
    );
  } catch (error) {
    wrapError("queryGsi", error);
  }
}

/**
 * Scan all items; useful for tiny labs only, not production request paths.
 *
 * @example
 * const allItems = await scanAll("app");
 */
export async function scanAll(
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<Item[]> {
  try {
    return (await ddb.send(new ScanCommand({ TableName: name }))).Items ?? [];
  } catch (error) {
    wrapError("scanAll", error);
  }
}

/**
 * Delete one item by key.
 *
 * @example
 * await deleteItem("USER#1", "PROFILE", "app");
 */
export async function deleteItem(
  pk: string,
  sk: string,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  try {
    await ddb.send(
      new DeleteItemCommand({
        TableName: name,
        Key: { pk: { S: pk }, sk: { S: sk } },
      }),
    );
  } catch (error) {
    wrapError("deleteItem", error);
  }
}

/**
 * Delete every item under a partition key. Useful for tenant cleanup/lab data lifecycle jobs.
 *
 * @example
 * await deleteItemsByPk("TENANT#acme#SESSION#s1");
 */
export async function deleteItemsByPk(
  pk: string,
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<number> {
  const items = await queryAllByPk(pk, 25, name, ddb);
  for (const item of items) {
    const sk = item.sk?.S;
    if (sk) await deleteItem(pk, sk, name, ddb);
  }
  return items.length;
}

/**
 * Delete table; missing tables are treated as already cleaned up.
 *
 * @example
 * await deleteTable("app");
 */
export async function deleteTable(
  name = tableName,
  ddb: DynamoDBClient = defaultClient,
): Promise<void> {
  try {
    await ddb.send(new DeleteTableCommand({ TableName: name }));
  } catch (error) {
    if (awsErrorName(error) === "ResourceNotFoundException") return;
    wrapError("deleteTable", error);
  }
}
