# Ops & Cost Command Center

Enterprise operations dashboard scenario for Phase 08.

## Scenarios

- SLO health, error budget, burn-rate, and alarm-driven incident alerts.
- CloudWatch Embedded Metric Format payloads.
- FinOps forecast, budget variance, cost anomaly detection, and tag allocation.
- Required tag governance, drift reports, and remediation ticket payloads.
- Backup compliance, disaster-recovery posture, and critical resource gaps.
- Redacted operations audit events for incident and compliance workflows.

## Run

```bash
pnpm --filter @floci-lab/phase-08 lab
pnpm --filter @floci-lab/phase-08 lab:enterprise
```

`lab` prints compact metric/tag/cost/backup examples. `lab:enterprise` runs full local command-center scenario.

## Learn by file

- `src/demo.ts` - quick EMF, tag, forecast, and backup tour.
- `src/scenarios/enterprise-ops-command-center.ts` - end-to-end SLO + FinOps + DR workflow.
- `../../src/examples/` - focused examples for incident response, governance, and backup compliance.

Full e2e can integrate CloudWatch, Backup, Config, Cost Explorer, Pricing, and Resource Groups Tagging API.
