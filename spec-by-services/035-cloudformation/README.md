# 035 - CloudFormation (Spec)

> Infra as code. Stacks, change sets, drift.

| | |
|---|---|
| **Category** | IaC |
| **Phase** | 6 |
| **Floci support** | partial |

## What it is
CloudFormation is an AWS iac service used in production backends for the use cases listed below.

## Real-world backend use cases
- Use case 1 specific to CloudFormation
- Use case 2 specific to CloudFormation
- Use case 3 specific to CloudFormation

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
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { awsDefaults } from "@floci-lab/aws-clients";
export const client = new CloudFormationClient(awsDefaults());
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
_(none)_

## Recommended order
Phase 6 - work through alongside other services listed in the phase spec.
