import type { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { S3Client } from "@aws-sdk/client-s3";
import type { SQSClient } from "@aws-sdk/client-sqs";

export interface ClientDefaults {
  region: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
  maxAttempts: number;
}

export type AwsServiceName = "s3" | "sqs" | "dynamodb";

export interface ServiceClientMap {
  s3: S3Client;
  sqs: SQSClient;
  dynamodb: DynamoDBClient;
}

export interface FlociHealth {
  ok: boolean;
  status: number;
  endpoint: string;
  services: string[];
  raw: unknown;
}
