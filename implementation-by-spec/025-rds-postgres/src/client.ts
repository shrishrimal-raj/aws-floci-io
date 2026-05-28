import { RDSClient } from "@aws-sdk/client-rds";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new RDSClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
