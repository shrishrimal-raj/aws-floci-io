import { describe, expect, it } from "vitest";
import { evaluatePolicy, findOverbroadStatements, tenantTaskPolicy, trustPolicyForPrincipal } from "../src/iam-policy.js";

describe("least-privilege IAM policies", () => {
  it("allows tenant-scoped DynamoDB and S3 actions", () => {
    const policy = tenantTaskPolicy("tenant-a", "arn:aws:dynamodb:us-east-1:123:table/taskflow", "arn:aws:s3:::taskflow");
    expect(evaluatePolicy(policy, "dynamodb:GetItem", "arn:aws:dynamodb:us-east-1:123:table/taskflow")).toBe("allow");
    expect(evaluatePolicy(policy, "s3:PutObject", "arn:aws:s3:::taskflow/tenants/tenant-a/file.txt")).toBe("allow");
    expect(evaluatePolicy(policy, "s3:DeleteObject", "arn:aws:s3:::taskflow/tenants/tenant-a/file.txt")).toBe("implicitDeny");
    expect(findOverbroadStatements(policy)).toEqual([]);
  });

  it("builds trust policy with external id", () => {
    expect(trustPolicyForPrincipal("arn:aws:iam::111111111111:role/analytics", "ext-1").Statement[0]).toMatchObject({
      Action: "sts:AssumeRole",
      Condition: { StringEquals: { "sts:ExternalId": "ext-1" } },
    });
  });
});
