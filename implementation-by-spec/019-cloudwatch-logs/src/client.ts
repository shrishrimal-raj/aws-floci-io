import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CloudWatchLogsClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
