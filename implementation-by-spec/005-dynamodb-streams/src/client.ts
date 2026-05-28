import { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new DynamoDBStreamsClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
