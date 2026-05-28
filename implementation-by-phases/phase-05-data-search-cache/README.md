# Phase 05 - Databases, Search, Cache, Analytics implementation

Analytics Platform v1 building blocks for relational data, cache, search, and data lake queries.

## Included

- RDS/ElastiCache/OpenSearch/Athena/Glue AWS client factory.
- Postgres product schema and tenant-safe repository.
- Redis-style read-through cache with single-flight stampede protection and jitter TTL.
- OpenSearch product mapping with text analyzer, fuzzy query, and kNN vector field.
- Bronze/silver/gold S3 partition prefix helper.
- Glue explicit external Parquet table definition.
- Athena query runner requiring partition predicates to control scan cost.
- Dashboard result cache keyed by tenant + dashboard + date range.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-05 test
pnpm --filter @floci-lab/phase-05 analytics:demo
```

## Production notes

Use RDS Proxy for serverless connection pooling. Namespace every Redis key by tenant. Protect hot dashboard paths with single-flight. Require Athena partition predicates. Prefer explicit Glue table definitions when schema must be controlled; crawlers are better for discovery.
