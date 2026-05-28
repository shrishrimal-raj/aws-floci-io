import { KMSClient } from "@aws-sdk/client-kms";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new KMSClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
