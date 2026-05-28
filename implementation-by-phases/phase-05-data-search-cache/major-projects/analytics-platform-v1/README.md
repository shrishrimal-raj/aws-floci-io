# Analytics Platform v1

Kinesis → Firehose → S3 Parquet → Glue → Athena → Redis dashboard cache pattern.

## Capabilities

- Bronze/silver/gold data lake path conventions.
- Explicit Glue catalog table for partitioned Parquet events.
- Athena query guard requiring tenant/date partition predicates.
- Redis-style dashboard cache.
- Postgres + read-through cache pattern for operational data.
- OpenSearch product full-text/vector mapping.

## Demo

```bash
pnpm --filter @floci-lab/phase-05 analytics:demo
```
