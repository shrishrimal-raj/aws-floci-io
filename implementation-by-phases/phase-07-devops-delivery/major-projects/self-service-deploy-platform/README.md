# Self-Service Deploy Platform

Hands-on enterprise platform that lets service teams deploy safely without direct production access.

## Scenario

A Git push starts CodeBuild, publishes immutable artifacts, deploys to ECS or Lambda with CodeDeploy, runs smoke tests, watches CloudWatch alarms, writes audit evidence, and rolls back automatically when health checks fail.

## Included real-world use cases

1. **Orders API ECS blue/green** - high-risk retail checkout release with SAST, audit logs, rollback alarms, dashboards, cost estimate, and DR drill.
2. **Payments Lambda canary** - compliance release with CAB approval, restricted artifact lifecycle, cross-account promotion, and conservative retries.
3. **SaaS billing worker** - EventBridge worker release with tenant-safe variables, fast retries, and deployment evidence.

## Run demo

```bash
cd implementation-by-phases/phase-07-devops-delivery
pnpm lab
```

## Files

- `src/demo.ts` - prints complete platform operator view and enterprise use cases.
- `../../src/deployment.ts` - buildspecs, strategies, rollback, audit, retry, lifecycle, observability.
- `../../src/pipeline.ts` - self-service stages, guardrails, cross-account promotion, cost, DR.
- `../../src/enterprise-examples.ts` - separate practical examples for enterprise learning.

## Security and operations patterns

- Least-privilege cross-account deploy roles.
- Required production approvals and change tickets.
- CloudWatch alarm and hook-based rollback.
- EventBridge/SIEM-ready audit events.
- Encrypted immutable artifact evidence.
- Cost controls through cache, job splitting, and docs-only deploy skips.
- Recovery drill from replicated release artifacts.
