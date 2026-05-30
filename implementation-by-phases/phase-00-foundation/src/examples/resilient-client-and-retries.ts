import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { createClient } from "@floci-lab/aws-clients";
import { enterpriseClientDefaults, withRetry } from "../index.js";

/**
 * Real-world scenario: CI verifies S3 connectivity with enterprise retry defaults.
 * Pattern covered: local Floci endpoint compatibility, bounded retries, SDK maxAttempts tuning.
 */
export async function resilientClientAndRetriesExample() {
  const defaults = enterpriseClientDefaults({ endpoint: "http://localhost:4566", region: "us-east-1" });
  const s3 = createClient("s3", defaults);

  const response = await withRetry(() => s3.send(new ListBucketsCommand({})), {
    attempts: 4,
    baseDelayMs: 50,
    maxDelayMs: 500,
    retryableErrors: ["TimeoutError", "ThrottlingException", "ServiceUnavailable"],
  });

  return {
    endpoint: defaults.endpoint,
    region: defaults.region,
    maxAttempts: defaults.maxAttempts,
    bucketCount: response.Buckets?.length ?? 0,
  };
}
