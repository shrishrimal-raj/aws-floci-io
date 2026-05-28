import { BackupClient } from "@aws-sdk/client-backup";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new BackupClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
