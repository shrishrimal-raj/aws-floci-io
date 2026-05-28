# 021 - SES (Spec)

> Transactional + bulk email. v1 API.

| | |
|---|---|
| **Category** | Communication |
| **Phase** | 2 |
| **Floci support** | full |

## What it is
SES is an AWS communication service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to SES
- Use case 2 specific to SES
- Use case 3 specific to SES

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
import { SESClient } from "@aws-sdk/client-ses";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new SESClient(awsDefaults());
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
- [022 - SES v2](../022-ses-v2/README.md)

## Recommended order
Phase 2 - work through alongside other services listed in the phase spec.
