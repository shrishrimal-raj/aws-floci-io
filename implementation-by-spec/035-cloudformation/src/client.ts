import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CloudFormationClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
