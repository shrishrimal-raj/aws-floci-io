# 001 - S3

> Enterprise object storage patterns: private buckets, tenant-safe keys, JSON documents, presigned URLs, versioning, lifecycle rules, audit logs, backup manifests, retries, AWS service integration, observability, compliance, and cost modeling.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/001-s3
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## What this module teaches

- Build tenant-scoped object keys and private upload/download flows.
- Store raw files and typed JSON documents with metadata.
- Protect data with versioning, lifecycle retention, audit logs, and backup manifests.
- Design event-driven S3 pipelines for Lambda, EventBridge, SQS, Step Functions, Glue/Athena, and monitoring.
- Model request/storage cost and add retry behavior for transient failures.

## Important functions

| Function | Purpose | Example scenario |
| --- | --- | --- |
| `createBucket`, `deleteBucket`, `emptyBucket` | Create and clean lab buckets safely. | Ephemeral test environments and per-workflow demo buckets. |
| `putObject`, `getObjectAsString`, `listObjects`, `deleteObject` | Store, read, list, and delete raw objects. | CSV imports, media files, exports, cleanup jobs. |
| `putJsonObject`, `getJsonObject` | Store typed JSON documents. | Profiles, manifests, audit payloads, integration events. |
| `enableVersioning`, `getVersioningStatus` | Preserve overwrite/delete history. | Regulated documents, DR drills, evidence vaults. |
| `putLifecycleExpirationRule`, `getLifecycleRuleIds` | Apply retention and expiry policies. | Temporary uploads, staging prefixes, compliance retention. |
| `createPresignedPutUrl`, `createPresignedPutUrlForObject`, `createPresignedGetUrl`, `createBrowserUploadSession` | Short-lived browser/mobile access to private S3. | Upload portals, private downloads, signed metadata uploads. |
| `tenantObjectKey`, `createSecureBrowserUploadSession` | Tenant/user-scoped secure upload contract. | SaaS document repositories and loan application portals. |
| `putObjectWithRetry` | Bounded retries for transient S3 failures. | Ingestion APIs and batch workers. |
| `writeAuditLogEntry` | Tenant/date-partitioned audit trail. | SOX, HIPAA, SOC 2, access evidence. |
| `writeBackupManifest` | List protected objects and store restore manifest. | Backup/DR runbooks and restore verification. |
| `s3Uri`, `parseS3Uri` | Canonical object references for service payloads. | EventBridge, Lambda, SQS, Glue/Athena, manifests. |
| `estimateMonthlyStorageCost` | Simple monthly storage/request estimate. | Architecture reviews and cost guardrails. |

## Enterprise examples

| File | Real-world use case | Main functions shown |
| --- | --- | --- |
| `src/examples/basic-object-storage.ts` | Basic bucket/object CRUD. | `createBucket`, `putObject`, `getObjectAsString`, `listObjects`, `createPresignedGetUrl` |
| `src/examples/json-document-store.ts` | Typed JSON profile/config storage. | `putJsonObject`, `getJsonObject` |
| `src/examples/browser-presigned-urls.ts` | Browser upload/download session. | `createBrowserUploadSession` |
| `src/examples/secure-enterprise-upload.ts` | Private tenant upload portal. | `tenantObjectKey`, `createSecureBrowserUploadSession` |
| `src/examples/audit-logging-compliance.ts` | Sensitive object access logging. | `writeAuditLogEntry`, `getJsonObject` |
| `src/examples/lifecycle-cost-optimization.ts` | Temporary upload retention and cost model. | `putLifecycleExpirationRule`, `putObjectWithRetry`, `estimateMonthlyStorageCost` |
| `src/examples/operations-and-observability.ts` | Operational metrics, presigned PUT variants, cleanup. | `createPresignedPutUrlForObject`, `deleteObject`, `emptyBucket` |
| `src/examples/event-driven-processing.ts` | Object-created event contract for async workers. | `putJsonObject`, `listObjects` |
| `src/examples/aws-service-integration-blueprint.ts` | EventBridge/Lambda/SQS/Step Functions/CloudWatch blueprint. | `s3Uri`, `putObjectWithRetry`, `writeAuditLogEntry`, `estimateMonthlyStorageCost` |
| `src/examples/backup-disaster-recovery.ts` | Restore manifest and versioning check. | `enableVersioning`, `getVersioningStatus`, `writeBackupManifest` |
| `src/examples/compliance-evidence-vault.ts` | SOC 2-style evidence vault. | `s3Uri`, `parseS3Uri`, `createPresignedGetUrl`, `writeBackupManifest` |
| `src/examples/media-asset-management.ts` | Media upload/transcode/thumbnail workflow. | Versioning, lifecycle, presigned URLs, audit logs |
| `src/examples/data-lake-analytics.ts` | Partitioned data lake and Glue/Athena-style manifest. | JSON objects, lifecycle, listing, cost, audit |
| `src/examples/secure-document-repository.ts` | Multi-tenant document repository. | Secure uploads, retention, audit, backup, versioning |

Run one example with:

```bash
pnpm tsx src/examples/compliance-evidence-vault.ts
```

## Production mapping

Floci is local and intentionally partial. For real AWS production add:

- **Secure access:** IAM least privilege, bucket policies, Block Public Access, KMS encryption, Cognito/API authorization, malware scanning.
- **Audit logging:** CloudTrail data events, structured application audit logs, retention policies, redaction for sensitive values.
- **Retries and errors:** idempotency keys, bounded exponential backoff, DLQs for async workers, replay runbooks.
- **Lifecycle and cost:** prefix-based retention, storage class transitions, request-volume dashboards, budget alarms.
- **Event-driven processing:** S3 notifications or EventBridge -> Lambda/SQS/Step Functions; DLQ and trace IDs on every object.
- **Monitoring:** CloudWatch metrics/alarms for object accepted, processing failed, retry count, age of oldest unprocessed object.
- **Backup/DR:** versioning, cross-region replication or AWS Backup, restore manifests, tested RTO/RPO.
- **Compliance:** Object Lock/legal hold where required, evidence vaults, access approvals, change records, encryption evidence.

## Module files

- `src/client.ts` - AWS SDK v3 S3 client configured for Floci LocalStack-style endpoint.
- `src/use-cases/object-storage.ts` - function-level S3 helpers with production-oriented docs.
- `src/examples/*` - hands-on enterprise scenarios listed above.
- `scripts/setup.ts`, `scripts/seed.ts`, `scripts/cleanup.ts` - local lab lifecycle scripts.
