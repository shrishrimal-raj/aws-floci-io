import { EC2Client } from "@aws-sdk/client-ec2";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new EC2Client({
  ...awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }),
});
