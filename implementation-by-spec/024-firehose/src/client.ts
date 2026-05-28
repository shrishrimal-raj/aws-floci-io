import { FirehoseClient } from "@aws-sdk/client-firehose";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new FirehoseClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
