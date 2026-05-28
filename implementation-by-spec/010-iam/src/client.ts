import { IAMClient } from "@aws-sdk/client-iam";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new IAMClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
