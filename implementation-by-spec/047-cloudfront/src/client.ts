import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CloudFrontClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
