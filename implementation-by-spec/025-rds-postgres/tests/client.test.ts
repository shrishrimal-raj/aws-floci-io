import { describe, it, expect, beforeAll, vi } from "vitest";
import type { RDSClient } from "@aws-sdk/client-rds";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { RDSPostgresError } from "../src/errors.js";
import { createPostgresInstance, describePostgresInstance, connectionString } from "../src/use-cases/databases.js";

function failingClient(name: string): RDSClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as RDSClient;
}

describe("RDS Postgres", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(connectionString("localhost", "app", "user", "p@ss")).toContain("postgresql://user:p%40ss@localhost:5432/app"); });
  it("wraps primary failures", async () => {
    await expect(createPostgresInstance({ identifier: "db" }, failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "RDS_POSTGRES_AccessDeniedException", message: "RDS Postgres createPostgresInstance failed" } satisfies Partial<RDSPostgresError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describePostgresInstance("db", failingClient("DBInstanceNotFoundFault"))).rejects.toMatchObject({ code: "RDS_POSTGRES_DBInstanceNotFoundFault", message: "RDS Postgres describePostgresInstance failed" } satisfies Partial<RDSPostgresError>);
  });
});
