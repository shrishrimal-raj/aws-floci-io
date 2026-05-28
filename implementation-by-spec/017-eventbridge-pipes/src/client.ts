import { PipesClient } from "@aws-sdk/client-pipes";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new PipesClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
