import { ACMClient } from "@aws-sdk/client-acm";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ACMClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
