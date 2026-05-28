import { CodeBuildClient } from "@aws-sdk/client-codebuild";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CodeBuildClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
