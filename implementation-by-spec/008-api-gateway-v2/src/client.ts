import { ApiGatewayV2Client } from "@aws-sdk/client-apigatewayv2";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ApiGatewayV2Client(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
