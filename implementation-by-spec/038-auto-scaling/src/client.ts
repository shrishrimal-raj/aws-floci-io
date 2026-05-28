import { AutoScalingClient } from "@aws-sdk/client-auto-scaling";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new AutoScalingClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
