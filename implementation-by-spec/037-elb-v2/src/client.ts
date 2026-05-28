import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new ElasticLoadBalancingV2Client(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
