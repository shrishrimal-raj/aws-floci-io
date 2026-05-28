import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SecretsManagerClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
