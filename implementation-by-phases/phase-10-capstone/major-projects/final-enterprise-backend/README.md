# Final Enterprise Backend

Production-grade capstone showing how to combine all phases into one multi-tenant SaaS backend.

## Scenarios

- **Tenant SaaS onboarding** - tenant RBAC, audit record, EventBridge provisioning routes, retry policy.
- **Regulated data operations** - lifecycle retention, SOC2 controls, observability, backup evidence, warm-standby DR.
- **Incident response workflow** - audit trail, ops event route, alarm checklist, rollback and DLQ replay steps.

## Run

```bash
pnpm --filter @floci-lab/phase-10 lab
```

## Learn

Start in `src/demo.ts`, then inspect each scenario file. Every example uses pure TypeScript planning helpers, so patterns are easy to test before wiring real AWS SDK clients.
