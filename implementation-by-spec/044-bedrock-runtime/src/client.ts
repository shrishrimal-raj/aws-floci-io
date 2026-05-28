import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new BedrockRuntimeClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
