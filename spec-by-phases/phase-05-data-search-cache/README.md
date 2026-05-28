# Phase 05 - Databases, Search, Cache, Analytics

> **Theme**: RDS, ElastiCache, OpenSearch, Athena, Glue, data lake patterns
> **Difficulty**: 4/5
> **Estimated time**: 3 weeks

## Learning goals
- Design relational schemas on RDS Postgres
- Use ElastiCache Redis for caching and rate limiting
- Index documents in OpenSearch for full-text and vector search
- Query S3 with Athena using Glue Data Catalog
- Build a bronze/silver/gold data lake

## Services covered
- [025 - RDS Postgres](../../spec-by-services/025-rds-postgres/README.md)
- [026 - ElastiCache Redis](../../spec-by-services/026-elasticache-redis/README.md)
- [032 - OpenSearch](../../spec-by-services/032-opensearch/README.md)
- [033 - Athena](../../spec-by-services/033-athena/README.md)
- [034 - Glue](../../spec-by-services/034-glue/README.md)

## Concepts to master
- Connection pooling for serverless (RDS Proxy)
- Cache stampede protection (single-flight, jitter TTL)
- OpenSearch mappings, analyzers, kNN
- Partitioning + Parquet for Athena cost optimization
- Glue crawlers vs explicit table definitions

## Mini-projects
- Postgres + Redis read-through cache
- Product search with OpenSearch typo tolerance
- Athena query over Firehose-delivered Parquet

## Major real-world project
**Analytics Platform v1** - Ingest events via Kinesis → Firehose (Parquet) → S3 partitioned by date → Glue catalog → Athena queries → Redis caching layer for dashboards.

Lives in: `implementation-by-phases/phase-05-data-search-cache/major-projects/analytics-platform-v1/`

## Folder structure
```
implementation-by-phases/phase-05-data-search-cache/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── analytics-platform-v1/
```

## Codex CLI prompt
See `prompts/phases/phase-05.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/025-rds-postgres && pnpm test && cd -
cd implementation-by-spec/026-elasticache-redis && pnpm test && cd -
cd implementation-by-spec/032-opensearch && pnpm test && cd -
cd implementation-by-spec/033-athena && pnpm test && cd -
cd implementation-by-spec/034-glue && pnpm test && cd -
cd implementation-by-phases/phase-05-data-search-cache && pnpm test
```

## Common bugs to debug
- Lambda exhausting RDS connection pool
- Cache key collisions across tenants
- Athena scanning full table due to missing partition predicate

## What a real production version would add
Production adds read replicas, PITR, OpenSearch ISM policies, and cost alerts per query.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
