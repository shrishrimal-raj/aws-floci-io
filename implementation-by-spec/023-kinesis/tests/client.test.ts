import { describe, it, expect, beforeAll, vi } from "vitest";
import type { KinesisClient } from "@aws-sdk/client-kinesis";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { KinesisDataStreamsError } from "../src/errors.js";
import { createStream, putJsonRecord } from "../src/use-cases/streams.js";

function failingClient(name: string): KinesisClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as KinesisClient;
}

describe("Kinesis", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(new TextEncoder().encode(JSON.stringify({ ok: true }))).toBeInstanceOf(Uint8Array); });
  it("wraps primary failures", async () => {
    await expect(createStream("s", 1, failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "KINESIS_AccessDeniedException", message: "Kinesis createStream failed" } satisfies Partial<KinesisDataStreamsError>);
  });
  it("wraps secondary failures", async () => {
    await expect(putJsonRecord("s", "pk", {}, failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "KINESIS_ResourceNotFoundException", message: "Kinesis putJsonRecord failed" } satisfies Partial<KinesisDataStreamsError>);
  });
});
