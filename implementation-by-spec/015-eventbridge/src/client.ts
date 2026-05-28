import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new EventBridgeClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
