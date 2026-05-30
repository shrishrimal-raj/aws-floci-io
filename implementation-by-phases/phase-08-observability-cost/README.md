# Phase 08 - Observability, Operations, Cost

Ops & Cost Command Center teaches practical production operations: SLOs, CloudWatch metrics, alarms, budgets, tags, backups, drift, and cost optimization.

## What you learn

- **Observability**: CloudWatch Embedded Metric Format, service health summaries, Slack-ready alerts.
- **SLOs**: availability, remaining error budget, burn rate, active alarm impact.
- **FinOps**: tag allocation, monthly forecasts, budget variance, anomaly detection, recommendations.
- **Governance**: required tag validation, drift reports, compliance ticket payloads.
- **Backup + DR**: backup coverage, critical unprotected resources, disaster-recovery posture.
- **Audit safety**: operations audit events and redaction for webhooks/tokens/secrets.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-08 typecheck
pnpm --filter @floci-lab/phase-08 test
pnpm --filter @floci-lab/phase-08 lab
pnpm --filter @floci-lab/phase-08 lab:enterprise
```

## Key files

- `src/error-budget.ts` - SLO availability, error budget, burn rate, health, Slack alert text.
- `src/ops-cost.ts` - EMF metrics, tags, costs, forecasts, backup/DR, drift, recommendations.
- `src/enterprise-patterns.ts` - audit events, redaction, anomalies, command-center snapshots, tag tickets.
- `src/examples/` - focused real-world incident, FinOps, and backup/DR examples.
- `major-projects/ops-cost-command-center/` - end-to-end enterprise command center scenario.

## Architecture

1. Services emit CloudWatch EMF metrics from logs.
2. SLO engine combines request counts and alarm states into health status.
3. Incident workflow posts Slack/PagerDuty text and records redacted audit event.
4. Cost workflow forecasts monthly spend and detects anomalies against baselines.
5. Tag governance validates required tags and creates remediation tickets.
6. Backup workflow identifies unprotected and critical resources for DR action.
7. Command-center snapshot feeds dashboards, reports, and executive summaries.

## Floci notes

Examples run locally with deterministic data. Full AWS/Floci labs can wire CloudWatch Metrics/Logs, Backup, Config, Cost Explorer, Pricing, and Resource Groups Tagging API.
