# 036 - ACM (Spec)

> TLS certificates. Auto-renew when used with AWS services.

| | |
|---|---|
| **Category** | Security |
| **Phase** | 3 |
| **Floci support** | stub |

## What it is
ACM is an AWS security service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to ACM
- Use case 2 specific to ACM
- Use case 3 specific to ACM

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
import { ACMClient } from "@aws-sdk/client-acm";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new ACMClient(awsDefaults());
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
- [009 - Cognito](../009-cognito/README.md)
- [010 - IAM](../010-iam/README.md)
- [011 - STS](../011-sts/README.md)
- [012 - KMS](../012-kms/README.md)

## Recommended order
Phase 3 - work through alongside other services listed in the phase spec.
