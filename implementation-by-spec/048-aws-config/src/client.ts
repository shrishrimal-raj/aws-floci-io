import { ConfigServiceClient } from "@aws-sdk/client-config-service";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ConfigServiceClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
