import { SNSClient } from "@aws-sdk/client-sns";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SNSClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
