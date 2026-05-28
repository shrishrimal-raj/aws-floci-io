# 022 - SES v2 (Spec)

> Modern SES API. Configuration sets, contact lists.

| | |
|---|---|
| **Category** | Communication |
| **Phase** | 2 |
| **Floci support** | full |

## What it is
SES v2 is an AWS communication service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to SES v2
- Use case 2 specific to SES v2
- Use case 3 specific to SES v2

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
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new SESv2Client(awsDefaults());
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
- [021 - SES](../021-ses/README.md)

## Recommended order
Phase 2 - work through alongside other services listed in the phase spec.
