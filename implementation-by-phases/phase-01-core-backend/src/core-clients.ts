import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { ApiGatewayV2Client } from "@aws-sdk/client-apigatewayv2";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { SNSClient } from "@aws-sdk/client-sns";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SSMClient } from "@aws-sdk/client-ssm";
import { awsDefaults, type AwsClientOptions } from "@floci-lab/aws-clients";

export interface CoreClients {
  s3: S3Client;
  sqs: SQSClient;
  sns: SNSClient;
  dynamodb: DynamoDBClient;
  lambda: LambdaClient;
  apiGatewayV1: APIGatewayClient;
  apiGatewayV2: ApiGatewayV2Client;
  secretsManager: SecretsManagerClient;
  ssm: SSMClient;
  cloudWatchLogs: CloudWatchLogsClient;
}

/**
 * Creates AWS SDK clients for Phase 01 services using Floci/LocalStack-friendly defaults.
 *
 * Example: tests and demos pass `{ endpoint: "http://localhost:4566" }`; production code can omit endpoint and rely on AWS env/role config.
 */
export function createCoreClients(options: AwsClientOptions = {}): CoreClients {
  const endpoint = options.endpoint ?? process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
  const defaults = awsDefaults({ endpoint, ...options });
  return {
    s3: new S3Client({ ...defaults, forcePathStyle: true }),
    sqs: new SQSClient(defaults),
    sns: new SNSClient(defaults),
    dynamodb: new DynamoDBClient(defaults),
    lambda: new LambdaClient(defaults),
    apiGatewayV1: new APIGatewayClient(defaults),
    apiGatewayV2: new ApiGatewayV2Client(defaults),
    secretsManager: new SecretsManagerClient(defaults),
    ssm: new SSMClient(defaults),
    cloudWatchLogs: new CloudWatchLogsClient(defaults),
  };
}
