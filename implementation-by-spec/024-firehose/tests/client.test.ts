import { describe, it, expect, beforeAll, vi } from "vitest";
import type { FirehoseClient } from "@aws-sdk/client-firehose";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { FirehoseError } from "../src/errors.js";
import { createS3DeliveryStream, describeDeliveryStream } from "../src/use-cases/delivery-streams.js";

function failingClient(name: string): FirehoseClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as FirehoseClient;
}

describe("Firehose", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(new TextEncoder().encode(JSON.stringify({ ok: true }) + "\n")).toBeInstanceOf(Uint8Array); });
  it("wraps primary failures", async () => {
    await expect(createS3DeliveryStream("s", "bucket", "role", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "FIREHOSE_AccessDeniedException", message: "Firehose createS3DeliveryStream failed" } satisfies Partial<FirehoseError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeDeliveryStream("s", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "FIREHOSE_ResourceNotFoundException", message: "Firehose describeDeliveryStream failed" } satisfies Partial<FirehoseError>);
  });
});
