import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { DynamoDBError } from "../src/errors.js";
import {
  createSingleTable,
  deleteItem,
  deleteTable,
  getItem,
  getJsonEntity,
  putItem,
  putItemIfAbsent,
  putJsonEntity,
  queryByPk,
  queryByPkPage,
  queryGsi,
  updateJsonPatch,
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
      table
    );

    expect((await getItem("USER#1", "PROFILE", table))?.name?.S).toBe("Ada");
    await updateJsonPatch("USER#1", "PROFILE", { name: "Grace" }, table);
    expect((await getItem("USER#1", "PROFILE", table))?.name?.S).toBe("Grace");
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
      table
    );
    await putItemIfAbsent({ pk: { S: "USER#2" }, sk: { S: "ORDER#1" }, total: { N: "42" } }, table);

    await expect(getJsonEntity<UserProfile>("USER#2", "PROFILE", table)).resolves.toEqual({
      name: "Ada",
      loginCount: 3,
      active: true,
    });

    const page = await queryByPkPage("USER#2", 1, undefined, table);
    expect(page.items).toHaveLength(1);
  });

  it("deletes individual items", async () => {
    await putItem({ pk: { S: "USER#3" }, sk: { S: "PROFILE" }, name: { S: "Delete Me" } }, table);
    await deleteItem("USER#3", "PROFILE", table);
    await expect(getItem("USER#3", "PROFILE", table)).resolves.toBeUndefined();
  });

  it("wraps SDK write failures in DynamoDBError", async () => {
    await expect(
      putItem({ pk: { S: "USER#X" }, sk: { S: "PROFILE" } }, table, failingClient("AccessDeniedException"))
    ).rejects.toMatchObject({
      code: "DynamoDB_AccessDeniedException",
      message: "DynamoDB putItem failed",
    } satisfies Partial<DynamoDBError>);
  });

  it("wraps SDK read failures in DynamoDBError", async () => {
    await expect(getItem("USER#X", "PROFILE", table, failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "DynamoDB_ResourceNotFoundException",
      message: "DynamoDB getItem failed",
    } satisfies Partial<DynamoDBError>);
  });
});
