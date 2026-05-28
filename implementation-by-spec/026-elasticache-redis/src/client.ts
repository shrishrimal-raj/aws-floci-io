import { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ElastiCacheClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
