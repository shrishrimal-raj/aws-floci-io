# 009 - Cognito (Spec)

> User pools + identity pools. JWT-based auth for apps.

| | |
|---|---|
| **Category** | Security |
| **Phase** | 3 |
| **Floci support** | partial |

## What it is
Cognito is an AWS security service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to Cognito
- Use case 2 specific to Cognito
- Use case 3 specific to Cognito

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
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new CognitoIdentityProviderClient(awsDefaults());
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
- [010 - IAM](../010-iam/README.md)
- [011 - STS](../011-sts/README.md)
- [012 - KMS](../012-kms/README.md)
- [013 - Secrets Manager](../013-secrets-manager/README.md)

## Recommended order
Phase 3 - work through alongside other services listed in the phase spec.
