import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import type { AwsServiceName, ClientDefaults, FlociHealth, ServiceClientMap } from "./types.js";

export interface AwsClientOptions {
  region?: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
  maxAttempts?: number;
}

const defaultEndpoint = "http://localhost:4566";

/**
 * Returns default AWS SDK v3 config.
 * Local mode uses Floci endpoint + dummy credentials.
 * Real AWS mode leaves endpoint/credentials undefined so normal provider chain can work.
 */
export function awsDefaults(overrides: AwsClientOptions = {}): ClientDefaults {
  const endpoint = overrides.endpoint ?? process.env.AWS_ENDPOINT_URL;
  const region = overrides.region ?? process.env.AWS_REGION ?? "us-east-1";
  const credentials =
    overrides.credentials ??
    (endpoint
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
        }
      : undefined);

  return {
    region,
    maxAttempts: overrides.maxAttempts ?? Number(process.env.AWS_MAX_ATTEMPTS ?? 3),
    ...(endpoint && { endpoint }),
    ...(credentials && { credentials }),
  };
}

/**
 * Returns config that always targets Floci. Use in local examples, tests, and lab CLI.
 */
export function flociDefaults(overrides: AwsClientOptions = {}): ClientDefaults {
  return awsDefaults({ endpoint: defaultEndpoint, ...overrides });
}

/**
 * Small service-aware factory for Phase 00 labs.
 * Add service constructors here as new phases need them.
 */
export function createClient<T extends AwsServiceName>(
  service: T,
  options: AwsClientOptions = {}
): ServiceClientMap[T] {
  const defaults = flociDefaults(options);

  switch (service) {
    case "s3":
      return new S3Client({ ...defaults, forcePathStyle: true }) as ServiceClientMap[T];
    case "sqs":
      return new SQSClient(defaults) as ServiceClientMap[T];
    case "dynamodb":
      return new DynamoDBClient(defaults) as ServiceClientMap[T];
    default: {
      const neverService: never = service;
      throw new Error(`Unsupported AWS service: ${neverService}`);
    }
  }
}

export async function getFlociHealth(endpoint = process.env.AWS_ENDPOINT_URL ?? defaultEndpoint): Promise<FlociHealth> {
  const res = await fetch(`${endpoint}/_floci/health`);
  let raw: unknown;
  const text = await res.text();
  try {
    raw = text ? JSON.parse(text) : undefined;
  } catch {
    raw = text;
  }

  return {
    ok: res.ok,
    status: res.status,
    endpoint,
    services: extractServices(raw),
    raw,
  };
}

function extractServices(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const value = raw as Record<string, unknown>;
  const direct = value.services;
  if (Array.isArray(direct)) return direct.map(String).sort();
  if (direct && typeof direct === "object") return Object.keys(direct).sort();
  return [];
}
