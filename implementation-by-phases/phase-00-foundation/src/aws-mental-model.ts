export interface ArnParts {
  partition: string;
  service: string;
  region: string;
  accountId: string;
  resource: string;
}

/**
 * Splits an AWS ARN into partition, service, region, account id, and resource fields.
 * Example: route audit logs by `service` or enforce account allow-lists before deploying resources.
 */
export function parseArn(arn: string): ArnParts {
  const [prefix, partition, service, region, accountId, ...resourceParts] = arn.split(":");
  if (prefix !== "arn" || !partition || !service || resourceParts.length === 0) {
    throw new Error(`Invalid ARN: ${arn}`);
  }

  return {
    partition,
    service,
    region,
    accountId,
    resource: resourceParts.join(":"),
  };
}

/**
 * Builds an AWS ARN from validated parts for examples, tests, and policy documents.
 * Example: construct `arn:aws:sqs:us-east-1:123456789012:orders-created` for access-control checks.
 */
export function buildArn(parts: ArnParts): string {
  return ["arn", parts.partition, parts.service, parts.region, parts.accountId, parts.resource].join(":");
}

/**
 * Derives a deterministic Availability Zone name from a region and suffix.
 * Example: place primary test resources in `us-east-1a` and failover resources in `us-east-1b`.
 */
export function availabilityZone(region: string, suffix = "a"): string {
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) {
    throw new Error(`Invalid AWS region: ${region}`);
  }
  return `${region}${suffix}`;
}
