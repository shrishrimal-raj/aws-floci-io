# 033 - Athena

Serverless SQL over S3. Helpers create workgroups, start queries, get status/results, delete workgroups, build external table SQL.

Run: `pnpm setup && pnpm seed && pnpm test && pnpm cleanup`.
Real AWS: partition data, compress/parquet, control result buckets, query costs, Glue catalog permissions.
