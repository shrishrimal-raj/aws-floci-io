import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CostExplorerClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
