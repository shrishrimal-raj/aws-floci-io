import { describe, it, expect, beforeAll, vi } from "vitest";
import type { SESClient } from "@aws-sdk/client-ses";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { SESError } from "../src/errors.js";
import { verifyEmail, sendTextEmail, template } from "../src/use-cases/email.js";

function failingClient(name: string): SESClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as SESClient;
}

describe("SES", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(template("Hi {{name}}", { name: "Ada" })).toBe("Hi Ada"); });
  it("wraps primary failures", async () => {
    await expect(verifyEmail("x@example.com", failingClient("AccessDenied"))).rejects.toMatchObject({ code: "SES_AccessDenied", message: "SES verifyEmail failed" } satisfies Partial<SESError>);
  });
  it("wraps secondary failures", async () => {
    await expect(sendTextEmail("from@example.com", ["to@example.com"], "s", "b", failingClient("MessageRejected"))).rejects.toMatchObject({ code: "SES_MessageRejected", message: "SES sendTextEmail failed" } satisfies Partial<SESError>);
  });
});
