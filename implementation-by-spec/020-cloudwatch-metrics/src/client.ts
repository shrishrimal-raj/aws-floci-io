import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CloudWatchClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
