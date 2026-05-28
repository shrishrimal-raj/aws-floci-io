import { ResourceGroupsTaggingAPIClient } from "@aws-sdk/client-resource-groups-tagging-api";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ResourceGroupsTaggingAPIClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
