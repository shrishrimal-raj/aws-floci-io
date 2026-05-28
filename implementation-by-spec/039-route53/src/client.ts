import { Route53Client } from "@aws-sdk/client-route-53";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new Route53Client(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
