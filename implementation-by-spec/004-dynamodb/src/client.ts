import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new DynamoDBClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
