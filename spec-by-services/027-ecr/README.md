# 027 - ECR (Spec)

> Container registry. Image scanning, lifecycle policies.

| | |
|---|---|
| **Category** | Containers |
| **Phase** | 6 |
| **Floci support** | full |

## What it is
ECR is an AWS containers service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to ECR
- Use case 2 specific to ECR
- Use case 3 specific to ECR

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
import { ECRClient } from "@aws-sdk/client-ecr";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new ECRClient(awsDefaults());
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
- [028 - ECS](../028-ecs/README.md)
- [030 - EKS](../030-eks/README.md)

## Recommended order
Phase 6 - work through alongside other services listed in the phase spec.
