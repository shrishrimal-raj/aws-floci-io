import { SSMClient } from "@aws-sdk/client-ssm";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SSMClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
