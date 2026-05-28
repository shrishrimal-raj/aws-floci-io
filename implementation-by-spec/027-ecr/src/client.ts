import { ECRClient } from "@aws-sdk/client-ecr";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ECRClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
