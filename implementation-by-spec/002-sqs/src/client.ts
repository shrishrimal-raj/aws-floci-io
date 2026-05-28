import { SQSClient } from "@aws-sdk/client-sqs";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SQSClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
