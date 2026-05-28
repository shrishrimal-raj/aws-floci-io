# 049 - Cost Explorer (Spec)

> Query cost + usage data.

| | |
|---|---|
| **Category** | Ops |
| **Phase** | 8 |
| **Floci support** | stub |

## What it is
Cost Explorer is an AWS ops service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to Cost Explorer
- Use case 2 specific to Cost Explorer
- Use case 3 specific to Cost Explorer

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
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new CostExplorerClient(awsDefaults());
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
- [048 - AWS Config](../048-aws-config/README.md)
- [050 - Pricing API](../050-pricing/README.md)

## Recommended order
Phase 8 - work through alongside other services listed in the phase spec.
