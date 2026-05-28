export interface ArnParts {
  partition: string;
  service: string;
  region: string;
  accountId: string;
  resource: string;
}

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

export function buildArn(parts: ArnParts): string {
  return ["arn", parts.partition, parts.service, parts.region, parts.accountId, parts.resource].join(":");
}

export function availabilityZone(region: string, suffix = "a"): string {
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) {
    throw new Error(`Invalid AWS region: ${region}`);
  }
  return `${region}${suffix}`;
}
