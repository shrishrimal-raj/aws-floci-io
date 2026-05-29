import { describe, it, expect, beforeAll, vi } from "vitest";
import type { EC2Client } from "@aws-sdk/client-ec2";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { EC2Error } from "../src/errors.js";
import { createSecurityGroup, runInstance, userData } from "../src/use-cases/instances.js";

function failingClient(name: string): EC2Client {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as EC2Client;
}

describe("EC2", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(Buffer.from(userData("#!/bin/bash")).toString("utf8")).toBe("#!/bin/bash"); });
  it("wraps primary failures", async () => {
    await expect(createSecurityGroup("sg", "desc", undefined, failingClient("UnauthorizedOperation"))).rejects.toMatchObject({ code: "EC2_UnauthorizedOperation", message: "EC2 createSecurityGroup failed" } satisfies Partial<EC2Error>);
  });
  it("wraps secondary failures", async () => {
    await expect(runInstance("ami", "t3.micro", failingClient("InvalidAMIID.NotFound"))).rejects.toMatchObject({ code: "EC2_InvalidAMIID.NotFound", message: "EC2 runInstance failed" } satisfies Partial<EC2Error>);
  });
});
