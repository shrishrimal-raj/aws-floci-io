import { describe, it, expect, beforeAll, vi } from "vitest";
import type { GlueClient } from "@aws-sdk/client-glue";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { GlueError } from "../src/errors.js";
import { createDatabase, getDatabase, s3TableLocation } from "../src/use-cases/catalog.js";

function failingClient(name: string): GlueClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as GlueClient;
}

describe("Glue", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(s3TableLocation("bucket", "/events/")).toBe("s3://bucket/events/"); });
  it("wraps primary failures", async () => {
    await expect(createDatabase("db", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "GLUE_AccessDeniedException", message: "Glue createDatabase failed" } satisfies Partial<GlueError>);
  });
  it("wraps secondary failures", async () => {
    await expect(getDatabase("db", failingClient("EntityNotFoundException"))).rejects.toMatchObject({ code: "GLUE_EntityNotFoundException", message: "Glue getDatabase failed" } satisfies Partial<GlueError>);
  });
});
