import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SchedulerClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
