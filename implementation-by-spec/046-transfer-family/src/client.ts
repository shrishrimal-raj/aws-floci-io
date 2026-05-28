import { TransferClient } from "@aws-sdk/client-transfer";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new TransferClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
