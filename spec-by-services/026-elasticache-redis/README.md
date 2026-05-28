# 026 - ElastiCache Redis (Spec)

> Managed Redis. Cluster mode, replication.

| | |
|---|---|
| **Category** | Database |
| **Phase** | 5 |
| **Floci support** | wire-only |

## What it is
ElastiCache Redis is an AWS database service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to ElastiCache Redis
- Use case 2 specific to ElastiCache Redis
- Use case 3 specific to ElastiCache Redis

## Core AWS concepts
- Concept 1
- Concept 2
- Concept 3

## Floci local setup
Already covered by the root `docker-compose.yml`. Verify with:
```bash
curl http://localhost:4566/_floci/health
```

## Node.js SDK v3 client setup
```ts
import { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new ElastiCacheClient(awsDefaults());
```

## Common operations
| Operation | API | Notes |
|---|---|---|
| TBD | TBD | TBD |

## Production notes
- Concurrency limits and quotas
- Retry / backoff
- Pagination
- Idempotency
- Cost drivers

## IAM / security
- Minimum policy for read
- Minimum policy for write
- Resource-level permissions
- Encryption at rest / in transit

## Real AWS cost notes
- Free tier
- Per-request / per-GB / per-hour pricing
- Cost optimization tips

## Limitations / pitfalls
- Pitfall 1
- Pitfall 2

## Floci vs real AWS differences
- Floci behavior
- Real AWS behavior
- When to switch to a real account

## Related services
- [004 - DynamoDB](../004-dynamodb/README.md)
- [005 - DynamoDB Streams](../005-dynamodb-streams/README.md)
- [025 - RDS Postgres](../025-rds-postgres/README.md)

## Recommended order
Phase 5 - work through alongside other services listed in the phase spec.
