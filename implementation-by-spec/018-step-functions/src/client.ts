import { SFNClient } from "@aws-sdk/client-sfn";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new SFNClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
