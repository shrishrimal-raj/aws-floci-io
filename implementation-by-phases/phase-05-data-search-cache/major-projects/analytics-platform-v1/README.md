# Analytics Platform v1

Hands-on enterprise example for multi-tenant commerce analytics.

## Scenarios

1. **Enterprise commerce search** - secure catalog indexing with tenant RBAC, audit logging, and retry backoff.
2. **Cost-optimized dashboard** - Athena partition SQL, Redis dashboard cache, and CloudWatch-style metrics.
3. **Compliance data lake** - bronze/silver/gold event partitioning, S3 lifecycle retention, resource tags, backup/DR plan, cache invalidation.

## Run

```bash
pnpm --filter @floci-lab/phase-05 analytics:demo
```

## Learn

Start with `src/demo.ts`, then open each scenario file in `src/`. Examples avoid real AWS writes by using local/in-memory adapters where possible and show where production AWS clients fit.
