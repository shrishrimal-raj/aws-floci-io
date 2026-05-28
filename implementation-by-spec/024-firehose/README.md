# 024 - Firehose

Managed delivery streams to S3/OpenSearch/Redshift. Helpers create S3 delivery stream, put JSON records/batches, describe/delete.

Run: `pnpm setup && pnpm seed && pnpm test && pnpm cleanup`.
Real AWS: tune buffering, compression, retries, backup bucket, schema format, alarms.
