import { OpenSearchClient } from "@aws-sdk/client-opensearch";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new OpenSearchClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
