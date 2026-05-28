import { AthenaClient } from "@aws-sdk/client-athena";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new AthenaClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
