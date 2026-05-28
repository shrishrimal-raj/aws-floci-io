import { TextractClient } from "@aws-sdk/client-textract";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new TextractClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
