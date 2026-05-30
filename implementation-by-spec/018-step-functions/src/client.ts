import { SFNClient } from "@aws-sdk/client-sfn";
import { awsDefaults } from "@floci-lab/aws-clients";

/**
 * Shared Step Functions SDK v3 client configured for Floci by default.
 * Example: local labs use `http://localhost:4566`; production relies on AWS SDK region/credential config.
 */
export const client = new SFNClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
