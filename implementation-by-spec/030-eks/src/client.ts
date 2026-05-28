import { EKSClient } from "@aws-sdk/client-eks";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new EKSClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
