import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { awsDefaults } from "@floci-lab/aws-clients";

/**
 * Shared EventBridge SDK v3 client configured for Floci by default.
 * Example: local labs use `http://localhost:4566`; production can override `AWS_ENDPOINT_URL` or AWS SDK env config.
 */
export const client = new EventBridgeClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
