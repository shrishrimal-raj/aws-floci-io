import { AppConfigClient } from "@aws-sdk/client-appconfig";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new AppConfigClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
