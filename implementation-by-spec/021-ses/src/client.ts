import { SESClient } from "@aws-sdk/client-ses";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SESClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
