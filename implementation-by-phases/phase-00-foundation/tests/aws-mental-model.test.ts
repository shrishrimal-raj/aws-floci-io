import { describe, expect, it } from "vitest";
import { availabilityZone, buildArn, parseArn } from "../src/aws-mental-model.js";

describe("AWS mental model helpers", () => {
  it("parses ARN components", () => {
    expect(parseArn("arn:aws:s3:us-east-1:123456789012:bucket/my-bucket")).toEqual({
      partition: "aws",
      service: "s3",
      region: "us-east-1",
      accountId: "123456789012",
      resource: "bucket/my-bucket",
    });
  });

  it("builds ARNs", () => {
    expect(
      buildArn({
        partition: "aws",
        service: "lambda",
        region: "us-east-1",
        accountId: "123456789012",
        resource: "function:worker",
      })
    ).toBe("arn:aws:lambda:us-east-1:123456789012:function:worker");
  });

  it("derives availability zones from regions", () => {
    expect(availabilityZone("us-east-1", "b")).toBe("us-east-1b");
  });
});
