# 024 - Firehose (Spec)

> Managed delivery streams. Buffer + write to S3/OpenSearch/Redshift.

| | |
|---|---|
| **Category** | Streaming |
| **Phase** | 4 |
| **Floci support** | full |

## What it is
Firehose is an AWS streaming service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to Firehose
- Use case 2 specific to Firehose
- Use case 3 specific to Firehose

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
import { FirehoseClient } from "@aws-sdk/client-firehose";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new FirehoseClient(awsDefaults());
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
- [023 - Kinesis Data Streams](../023-kinesis/README.md)
- [031 - MSK (Kafka)](../031-msk-kafka/README.md)

## Recommended order
Phase 4 - work through alongside other services listed in the phase spec.
