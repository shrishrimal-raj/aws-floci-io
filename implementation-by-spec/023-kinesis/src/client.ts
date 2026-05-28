import { KinesisClient } from "@aws-sdk/client-kinesis";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new KinesisClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
