# 044 - Bedrock Runtime (Spec)

> Invoke foundation models (Claude, Llama, Titan).

| | |
|---|---|
| **Category** | AI/ML |
| **Phase** | 9 |
| **Floci support** | stub |

## What it is
Bedrock Runtime is an AWS ai/ml service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to Bedrock Runtime
- Use case 2 specific to Bedrock Runtime
- Use case 3 specific to Bedrock Runtime

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
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new BedrockRuntimeClient(awsDefaults());
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
- [045 - Textract](../045-textract/README.md)

## Recommended order
Phase 9 - work through alongside other services listed in the phase spec.
