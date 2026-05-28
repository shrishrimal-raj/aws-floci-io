import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new APIGatewayClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
