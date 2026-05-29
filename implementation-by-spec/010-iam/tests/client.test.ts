import { describe, it, expect, beforeAll, vi } from "vitest";
import type { IAMClient } from "@aws-sdk/client-iam";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { IAMError } from "../src/errors.js";
import {
  attachPolicy,
  createIamAuditEvent,
  createPolicy,
  leastPrivilegePolicy,
  multiStatementPolicy,
  policyDocument,
  resourceArn,
  serviceTrustPolicy,
  validatePolicyDocument,
} from "../src/use-cases/access.js";

function failingClient(name: string): IAMClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as IAMClient;
}

describe("IAM", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("builds least-privilege policy documents", () => {
    expect(policyDocument(["s3:GetObject"], ["arn"])).toContain("s3:GetObject");
    const multi = JSON.parse(
      multiStatementPolicy([
        {
          actions: ["s3:GetObject"],
          resources: ["arn"],
          conditions: { StringEquals: { "aws:PrincipalTag/tenantId": "acme" } },
        },
      ]),
    );
    expect(multi.Statement[0].Resource).toEqual(["arn"]);
    expect(
      multi.Statement[0].Condition.StringEquals["aws:PrincipalTag/tenantId"],
    ).toBe("acme");

    expect(serviceTrustPolicy("ecs-tasks.amazonaws.com")).toContain(
      "ecs-tasks.amazonaws.com",
    );
    expect(resourceArn("sqs", "us-east-1", "orders", "123456789012")).toBe(
      "arn:aws:sqs:us-east-1:123456789012:orders",
    );

    const tenantPolicy = leastPrivilegePolicy({
      service: "dynamodb",
      actions: ["GetItem"],
      resourceArn: "arn:aws:dynamodb:us-east-1:123456789012:table/orders",
      tenantId: "acme",
    });
    expect(tenantPolicy).toContain("dynamodb:GetItem");
    expect(
      validatePolicyDocument(policyDocument(["s3:*"], ["*"])),
    ).toHaveLength(2);
    expect(
      createIamAuditEvent({
        action: "CreatePolicy",
        principal: "ci",
        resource: "orders",
        outcome: "ALLOW",
      }).eventId,
    ).toContain("iam-");
  });

  it("wraps SDK policy failures in IAMError", async () => {
    await expect(
      createPolicy("x", "{}", failingClient("AccessDenied")),
    ).rejects.toMatchObject({
      code: "IAM_AccessDenied",
      message: "IAM createPolicy failed",
    } satisfies Partial<IAMError>);
  });

  it("wraps SDK attach failures in IAMError", async () => {
    await expect(
      attachPolicy("role", "arn", failingClient("NoSuchEntity")),
    ).rejects.toMatchObject({
      code: "IAM_NoSuchEntity",
      message: "IAM attachPolicy failed",
    } satisfies Partial<IAMError>);
  });
});
