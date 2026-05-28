import { describe, expect, it } from "vitest";
import { awsDefaults, createClient, flociDefaults } from "@floci-lab/aws-clients";

describe("Phase 00 AWS SDK factory", () => {
  it("uses dummy credentials when endpoint override exists", () => {
    const defaults = awsDefaults({ endpoint: "http://localhost:4566" });
    expect(defaults).toMatchObject({
      region: "us-east-1",
      endpoint: "http://localhost:4566",
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
      maxAttempts: 3,
    });
  });

  it("flociDefaults always targets local Floci", () => {
    expect(flociDefaults({ region: "eu-west-1" })).toMatchObject({
      region: "eu-west-1",
      endpoint: "http://localhost:4566",
    });
  });

  it("creates service clients for first smoke-test services", () => {
    expect(createClient("s3").constructor.name).toBe("S3Client");
    expect(createClient("sqs").constructor.name).toBe("SQSClient");
    expect(createClient("dynamodb").constructor.name).toBe("DynamoDBClient");
  });
});
