import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { DynamoDBError } from "../src/errors.js";
import {
  auditEntity,
  createSingleTable,
  deleteItem,
  deleteItemsByPk,
  deleteTable,
  describeTable,
  entityKeys,
  estimateDynamoDbCost,
  getItem,
  getJsonEntity,
  putItem,
  putItemIfAbsent,
  putJsonEntity,
  putJsonEntityIfAbsent,
  queryAllByPk,
  queryByPk,
  queryByPkPage,
  queryGsi,
  scanAll,
  statusIndexKeys,
  updateJsonPatch,
  updateJsonPatchWithRetry,
} from "../src/use-cases/table.js";

interface UserProfile extends Record<string, string | number | boolean> {
  name: string;
  loginCount: number;
  active: boolean;
}

const table = `floci-ddb-test-${Date.now()}`;

function failingClient(name: string): DynamoDBClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as DynamoDBClient;
}

describe("DynamoDB", () => {
  beforeAll(async () => {
    await waitForFloci();
    await createSingleTable(table);
  });

  afterAll(async () => {
    await deleteTable(table);
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("writes, reads, updates, and queries single-table items", async () => {
    await putItem(
      {
        pk: { S: "USER#1" },
        sk: { S: "PROFILE" },
        name: { S: "Ada" },
        gsi1pk: { S: "EMAIL#ada@example.com" },
        gsi1sk: { S: "USER#1" },
      },
      table,
    );

    expect((await getItem("USER#1", "PROFILE", table))?.name?.S).toBe("Ada");
    await updateJsonPatch("USER#1", "PROFILE", { name: "Grace" }, table);
    await updateJsonPatchWithRetry(
      "USER#1",
      "PROFILE",
      { name: "Grace Hopper" },
      { attempts: 2, baseDelayMs: 1 },
      table,
    );
    expect((await getItem("USER#1", "PROFILE", table))?.name?.S).toBe(
      "Grace Hopper",
    );
    expect(await queryByPk("USER#1", table)).toHaveLength(1);
    expect(await queryGsi("EMAIL#ada@example.com", table)).toHaveLength(1);
  });

  it("stores typed JSON entities and reads paginated query pages", async () => {
    await putJsonEntity<UserProfile>(
      {
        pk: "USER#2",
        sk: "PROFILE",
        entityType: "UserProfile",
        value: { name: "Ada", loginCount: 3, active: true },
        gsi1pk: "EMAIL#ada2@example.com",
        gsi1sk: "USER#2",
      },
      table,
    );
    await putItemIfAbsent(
      { pk: { S: "USER#2" }, sk: { S: "ORDER#1" }, total: { N: "42" } },
      table,
    );

    await expect(
      getJsonEntity<UserProfile>("USER#2", "PROFILE", table),
    ).resolves.toEqual({
      name: "Ada",
      loginCount: 3,
      active: true,
    });

    const page = await queryByPkPage("USER#2", 1, undefined, table);
    expect(page.items).toHaveLength(1);
    await expect(queryAllByPk("USER#2", 1, table)).resolves.toHaveLength(2);
  });

  it("builds enterprise keys, audit items, and estimates cost", async () => {
    const keys = entityKeys({
      tenantId: "acme",
      entityType: "order",
      entityId: "o-1",
    });
    expect(keys).toEqual({ pk: "TENANT#acme#ORDER#o-1", sk: "PROFILE" });

    const status = statusIndexKeys(
      "acme",
      "order",
      "open",
      "2026-05-30T00:00:00.000Z",
    );
    expect(status.gsi1pk).toBe("TENANT#acme#ORDER#STATUS#OPEN");

    await putJsonEntityIfAbsent(
      {
        ...keys,
        entityType: "Order",
        value: { tenantId: "acme", orderId: "o-1", status: "OPEN" },
        ...status,
      },
      table,
    );

    const audit = auditEntity({
      tenantId: "acme",
      actorId: "u-1",
      action: "OrderRead",
      resourceId: "o-1",
      outcome: "ALLOW",
    });
    await putJsonEntity(audit, table);
    expect(await queryByPk(audit.pk, table)).toHaveLength(1);

    const estimate = estimateDynamoDbCost({
      readRequestUnits: 1_000_000,
      writeRequestUnits: 1_000_000,
      storageGb: 2,
    });
    expect(estimate.totalUsd).toBeCloseTo(2.0);
  });

  it("describes, scans, and deletes partition data", async () => {
    await expect(describeTable(table)).resolves.toMatchObject({
      TableName: table,
    });
    expect((await scanAll(table)).length).toBeGreaterThanOrEqual(1);

    const pk = "TENANT#acme#SESSION#s1";
    await putJsonEntity(
      { pk, sk: "ITEM#1", entityType: "SessionItem", value: { id: "1" } },
      table,
    );
    await putJsonEntity(
      { pk, sk: "ITEM#2", entityType: "SessionItem", value: { id: "2" } },
      table,
    );
    await expect(deleteItemsByPk(pk, table)).resolves.toBe(2);
    await expect(queryAllByPk(pk, 10, table)).resolves.toHaveLength(0);
  });

  it("deletes individual items", async () => {
    await putItem(
      { pk: { S: "USER#3" }, sk: { S: "PROFILE" }, name: { S: "Delete Me" } },
      table,
    );
    await deleteItem("USER#3", "PROFILE", table);
    await expect(getItem("USER#3", "PROFILE", table)).resolves.toBeUndefined();
  });

  it("wraps SDK write failures in DynamoDBError", async () => {
    await expect(
      putItem(
        { pk: { S: "USER#X" }, sk: { S: "PROFILE" } },
        table,
        failingClient("AccessDeniedException"),
      ),
    ).rejects.toMatchObject({
      code: "DynamoDB_AccessDeniedException",
      message: "DynamoDB putItem failed",
    } satisfies Partial<DynamoDBError>);
  });

  it("wraps SDK read failures in DynamoDBError", async () => {
    await expect(
      getItem(
        "USER#X",
        "PROFILE",
        table,
        failingClient("ResourceNotFoundException"),
      ),
    ).rejects.toMatchObject({
      code: "DynamoDB_ResourceNotFoundException",
      message: "DynamoDB getItem failed",
    } satisfies Partial<DynamoDBError>);
  });
});
