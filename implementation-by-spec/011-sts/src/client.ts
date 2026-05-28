import { STSClient } from "@aws-sdk/client-sts";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new STSClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
