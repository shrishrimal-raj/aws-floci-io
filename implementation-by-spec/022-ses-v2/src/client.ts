import { SESv2Client } from "@aws-sdk/client-sesv2";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SESv2Client(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
