import { ECSClient } from "@aws-sdk/client-ecs";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ECSClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
