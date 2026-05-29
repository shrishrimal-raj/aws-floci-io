import { describe, it, expect, beforeAll, vi } from "vitest";
import type { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { CloudFormationError } from "../src/errors.js";
import { createStack, describeStack, s3BucketTemplate } from "../src/use-cases/stacks.js";

function failingClient(name: string): CloudFormationClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as CloudFormationClient;
}

describe("CloudFormation", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(JSON.parse(s3BucketTemplate("bucket")).Resources.Bucket.Type).toBe("AWS::S3::Bucket"); });
  it("wraps primary failures", async () => {
    await expect(createStack("stack", s3BucketTemplate("bucket"), failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "CLOUDFORMATION_AccessDeniedException", message: "CloudFormation createStack failed" } satisfies Partial<CloudFormationError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeStack("stack", failingClient("ValidationError"))).rejects.toMatchObject({ code: "CLOUDFORMATION_ValidationError", message: "CloudFormation describeStack failed" } satisfies Partial<CloudFormationError>);
  });
});
