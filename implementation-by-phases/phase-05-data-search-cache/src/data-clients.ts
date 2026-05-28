import { AthenaClient } from "@aws-sdk/client-athena";
import { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { GlueClient } from "@aws-sdk/client-glue";
import { OpenSearchClient } from "@aws-sdk/client-opensearch";
import { RDSClient } from "@aws-sdk/client-rds";
import { awsDefaults, type AwsClientOptions } from "@floci-lab/aws-clients";

export interface DataClients {
  rds: RDSClient;
  elasticache: ElastiCacheClient;
  opensearch: OpenSearchClient;
  athena: AthenaClient;
  glue: GlueClient;
}

export function createDataClients(options: AwsClientOptions = {}): DataClients {
  const endpoint = options.endpoint ?? process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
  const defaults = awsDefaults({ endpoint, ...options });
  return {
    rds: new RDSClient(defaults),
    elasticache: new ElastiCacheClient(defaults),
    opensearch: new OpenSearchClient(defaults),
    athena: new AthenaClient(defaults),
    glue: new GlueClient(defaults),
  };
}
