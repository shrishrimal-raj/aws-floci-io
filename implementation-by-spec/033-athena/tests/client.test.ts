import { describe, it, expect, beforeAll, vi } from "vitest";
import type { AthenaClient } from "@aws-sdk/client-athena";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { AthenaError } from "../src/errors.js";
import { createWorkGroup, startQuery, createExternalTableSql } from "../src/use-cases/queries.js";

function failingClient(name: string): AthenaClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as AthenaClient;
}

describe("Athena", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(createExternalTableSql("events", "s3://bucket/events/")).toContain("CREATE EXTERNAL TABLE"); });
  it("wraps primary failures", async () => {
    await expect(createWorkGroup("wg", "s3://out/", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "ATHENA_AccessDeniedException", message: "Athena createWorkGroup failed" } satisfies Partial<AthenaError>);
  });
  it("wraps secondary failures", async () => {
    await expect(startQuery("SELECT 1", "default", "s3://out/", undefined, failingClient("InvalidRequestException"))).rejects.toMatchObject({ code: "ATHENA_InvalidRequestException", message: "Athena startQuery failed" } satisfies Partial<AthenaError>);
  });
});
