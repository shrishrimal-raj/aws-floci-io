import { CodeDeployClient } from "@aws-sdk/client-codedeploy";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CodeDeployClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
