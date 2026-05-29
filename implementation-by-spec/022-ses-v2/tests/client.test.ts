import { describe, it, expect, beforeAll, vi } from "vitest";
import type { SESv2Client } from "@aws-sdk/client-sesv2";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { SESv2Error } from "../src/errors.js";
import { createConfigurationSet, sendEmailV2 } from "../src/use-cases/email-v2.js";

function failingClient(name: string): SESv2Client {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as SESv2Client;
}

describe("SES v2", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect("floci-sesv2-dev").toContain("sesv2"); });
  it("wraps primary failures", async () => {
    await expect(createConfigurationSet("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "SES_V2_AccessDeniedException", message: "SES v2 createConfigurationSet failed" } satisfies Partial<SESv2Error>);
  });
  it("wraps secondary failures", async () => {
    await expect(sendEmailV2("from@example.com", ["to@example.com"], "s", "b", undefined, failingClient("MessageRejected"))).rejects.toMatchObject({ code: "SES_V2_MessageRejected", message: "SES v2 sendEmailV2 failed" } satisfies Partial<SESv2Error>);
  });
});
