import { S3Client } from "@aws-sdk/client-s3";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new S3Client({
  ...awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }),
  forcePathStyle: true,
});
