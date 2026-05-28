import { GlueClient } from "@aws-sdk/client-glue";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new GlueClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
