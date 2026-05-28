# Phase 08 - Observability, Operations, Cost

> **Theme**: CW Metrics, Backup, Config, Cost Explorer, Pricing, Tagging
> **Difficulty**: 3/5
> **Estimated time**: 2 weeks

## Learning goals
- Emit custom metrics with EMF (embedded metric format)
- Build dashboards and alarms
- Manage backups and DR with AWS Backup
- Enforce tagging and compliance with AWS Config
- Analyze and forecast cost with Cost Explorer

## Services covered
- [020 - CloudWatch Metrics](../../spec-by-services/020-cloudwatch-metrics/README.md)
- [042 - AWS Backup](../../spec-by-services/042-backup/README.md)
- [048 - AWS Config](../../spec-by-services/048-aws-config/README.md)
- [049 - Cost Explorer](../../spec-by-services/049-cost-explorer/README.md)
- [050 - Pricing API](../../spec-by-services/050-pricing/README.md)
- [051 - Resource Groups Tagging API](../../spec-by-services/051-resource-groups-tagging-api/README.md)

## Concepts to master
- EMF for high-cardinality metrics
- Alarm composite logic
- Tag strategy: Environment, Owner, CostCenter, Project
- Config rules and remediation
- Cost allocation tags

## Mini-projects
- EMF metrics emitter with p50/p95/p99
- Config rule for required tags
- Weekly cost report by tag

## Major real-world project
**Ops & Cost Command Center** - A dashboard that aggregates per-service health, error budgets, backup status, drift, and cost — wired to Slack alerts.

Lives in: `implementation-by-phases/phase-08-observability-cost/major-projects/ops-cost-command-center/`

## Folder structure
```
implementation-by-phases/phase-08-observability-cost/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── ops-cost-command-center/
```

## Codex CLI prompt
See `prompts/phases/phase-08.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/020-cloudwatch-metrics && pnpm test && cd -
cd implementation-by-spec/042-backup && pnpm test && cd -
cd implementation-by-spec/048-aws-config && pnpm test && cd -
cd implementation-by-spec/049-cost-explorer && pnpm test && cd -
cd implementation-by-spec/050-pricing && pnpm test && cd -
cd implementation-by-spec/051-resource-groups-tagging-api && pnpm test && cd -
cd implementation-by-phases/phase-08-observability-cost && pnpm test
```

## Common bugs to debug
- Metrics without dimensions → ungroupable
- Backup vaults across regions misconfigured
- Untagged resources skew cost reports

## What a real production version would add
Production adds SLO/error-budget tracking, cost anomaly detection, and quarterly DR drills.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
