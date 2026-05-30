# Phase 10 - Capstone Projects

Final hands-on module for designing production-grade AWS backends across compute, data, events, security, observability, delivery, cost, and compliance.

## Included

- `src/capstone-catalog.ts` - 10 capstone projects, service coverage, recommendations, readiness scoring.
- `src/architecture-review.ts` - production concern checklist and review summary helpers.
- `src/enterprise-blueprint.ts` - secure access, audit records, retries, event routes, lifecycle, observability, cost controls, backup/DR, compliance controls.
- `projects/001-010` - individual project starters and README specs.
- `major-projects/final-enterprise-backend` - complete enterprise scenario walkthroughs.

## Enterprise examples

- Multi-tenant SaaS onboarding with RBAC, audit, EventBridge routes, and retry policy.
- Regulated analytics operations with lifecycle management, SOC2 controls, backup evidence, and warm-standby DR.
- Incident response workflow with audit logging, alarms, rollback steps, and DLQ replay.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-10 test
pnpm --filter @floci-lab/phase-10 typecheck
pnpm --filter @floci-lab/phase-10 lab
```

## Production checklist

Cover compute, data, events, security, observability, and delivery before calling a capstone production-grade. Add tenant isolation, audit logs, retries, lifecycle policies, cost controls, backup/DR targets, compliance evidence, and operational runbooks.
