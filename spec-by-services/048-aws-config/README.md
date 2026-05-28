# 048 - AWS Config (Spec)

> Resource compliance + drift detection.

| | |
|---|---|
| **Category** | Ops |
| **Phase** | 8 |
| **Floci support** | partial |

## What it is
AWS Config is an AWS ops service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to AWS Config
- Use case 2 specific to AWS Config
- Use case 3 specific to AWS Config

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
import { ConfigServiceClient } from "@aws-sdk/client-config-service";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new ConfigServiceClient(awsDefaults());
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
- [042 - AWS Backup](../042-backup/README.md)
- [043 - AppConfig](../043-appconfig/README.md)
- [049 - Cost Explorer](../049-cost-explorer/README.md)
- [050 - Pricing API](../050-pricing/README.md)

## Recommended order
Phase 8 - work through alongside other services listed in the phase spec.
