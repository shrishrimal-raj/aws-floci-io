# Phase 05 - Data, Search, Cache, Analytics

Enterprise learning module for RDS/Postgres, ElastiCache, OpenSearch, Glue, Athena, and S3 data lake patterns.

## What is included

- `src/postgres-cache.ts` - tenant-safe product schema, SQL repository, cache-aside reads, TTL jitter, single-flight stampede protection.
- `src/opensearch.ts` - product search mapping, fuzzy tenant-filtered query, document indexing.
- `src/data-lake.ts` - bronze/silver/gold S3 prefixes, Glue Parquet table, Athena partition guard.
- `src/dashboard-cache.ts` - tenant/date dashboard result cache.
- `src/enterprise-patterns.ts` - RBAC guard, audit logging, retries, metrics, cache invalidation, lifecycle, backup/DR, compliance tags.
- `major-projects/analytics-platform-v1` - practical enterprise scenarios using all building blocks.

## Enterprise examples

- Commerce search write path: tenant RBAC, audit events, retrying OpenSearch indexing.
- Cost-optimized executive dashboard: partition-safe Athena SQL, Redis cache, latency/failure metrics.
- Regulated data lake controls: event partitioning, S3 lifecycle retention, compliance tags, RDS DR plan, cache invalidation.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-05 test
pnpm --filter @floci-lab/phase-05 typecheck
pnpm --filter @floci-lab/phase-05 analytics:demo
```

## Production notes

Use RDS Proxy for serverless pooling. Namespace every cache key by tenant. Protect hot reads with single-flight and TTL jitter. Require Athena tenant/date partitions to control scan cost. Add audit logs and metrics around every data access. Use S3 lifecycle rules, PITR backups, cross-region copies, and compliance tags for regulated workloads.
