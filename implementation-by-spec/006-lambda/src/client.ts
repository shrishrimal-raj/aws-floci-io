import { LambdaClient } from "@aws-sdk/client-lambda";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new LambdaClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
