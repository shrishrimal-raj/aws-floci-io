# 007 - API Gateway v1 (REST) (Spec)

> Full-featured REST APIs with stages, models, request validation.

| | |
|---|---|
| **Category** | Networking |
| **Phase** | 1 |
| **Floci support** | full |

## What it is
API Gateway v1 (REST) is an AWS networking service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to API Gateway v1 (REST)
- Use case 2 specific to API Gateway v1 (REST)
- Use case 3 specific to API Gateway v1 (REST)

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
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new APIGatewayClient(awsDefaults());
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
- [008 - API Gateway v2 (HTTP)](../008-api-gateway-v2/README.md)
- [037 - ELB v2 (ALB/NLB)](../037-elb-v2/README.md)
- [039 - Route53](../039-route53/README.md)
- [046 - Transfer Family](../046-transfer-family/README.md)

## Recommended order
Phase 1 - work through alongside other services listed in the phase spec.
