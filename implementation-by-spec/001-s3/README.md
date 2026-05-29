# 001 - S3

> Enterprise object storage with buckets, tenant-safe keys, versioning, lifecycle rules, JSON documents, presigned URLs, audit logs, backup manifests, retries, and cost modeling.

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

## Module

- `src/client.ts` - S3 SDK v3 client for Floci (`http://localhost:4566`, path-style buckets).
- `src/use-cases/object-storage.ts` - production-style S3 helpers and enterprise workflow utilities.
- `src/examples/basic-object-storage.ts` - bucket + object CRUD + list + presigned GET.
- `src/examples/json-document-store.ts` - typed JSON document storage.
- `src/examples/browser-presigned-urls.ts` - simple browser upload/download URL session.
- `src/examples/secure-enterprise-upload.ts` - tenant-scoped upload session with signed content type and metadata.
- `src/examples/audit-logging-compliance.ts` - sensitive object workflow with tenant/date-partitioned audit logs.
- `src/examples/lifecycle-cost-optimization.ts` - temp prefix lifecycle rule, retry upload, monthly cost estimate.
- `src/examples/operations-and-observability.ts` - presigned PUT variants, structured audit/metric payloads, explicit delete/empty cleanup.
- `src/examples/event-driven-processing.ts` - object-created event payload ready for EventBridge/Lambda/SQS.
- `src/examples/backup-disaster-recovery.ts` - versioning plus backup manifest for restore drills.
- `scripts/setup.ts` - creates `floci-s3-lab`, enables versioning, writes lifecycle rule.
- `scripts/seed.ts` - uploads fixture object.
- `scripts/cleanup.ts` - empties and deletes created bucket.

## Operations covered

| Operation        | Function                                                                                                         | Notes                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Create bucket    | `createBucket`                                                                                                   | Idempotent for already-owned buckets.                                           |
| Versioning       | `enableVersioning`, `getVersioningStatus`                                                                        | Protects overwrites/deletes; cleanup removes versions/delete markers.           |
| Lifecycle        | `putLifecycleExpirationRule`, `getLifecycleRuleIds`                                                              | Expire temp, import, export, and staging prefixes.                              |
| Raw upload/read  | `putObject`, `getObjectAsString`                                                                                 | Supports content type and user metadata.                                        |
| Retry upload     | `putObjectWithRetry`                                                                                             | Bounded exponential backoff for transient S3 failures.                          |
| JSON upload/read | `putJsonObject`, `getJsonObject`                                                                                 | Profiles, configs, manifests, audit docs, exports.                              |
| Prefix listing   | `listObjects`                                                                                                    | Handles `ListObjectsV2` pagination.                                             |
| Cleanup          | `deleteObject`, `emptyBucket`, `deleteBucket`                                                                    | Handles unversioned objects, versions, delete markers.                          |
| Presigned access | `createPresignedPutUrl`, `createPresignedPutUrlForObject`, `createPresignedGetUrl`, `createBrowserUploadSession` | Private bucket, short-lived access; object variant signs content type/metadata. |
| Secure upload    | `tenantObjectKey`, `createSecureBrowserUploadSession`                                                            | Tenant/user key scope, signed content type, metadata, max-size contract.        |
| Audit logging    | `writeAuditLogEntry`                                                                                             | Writes immutable-style JSON audit entry under `audit/tenant=.../date=...`.      |
| Backup manifest  | `writeBackupManifest`                                                                                            | Lists protected prefix and stores restore manifest.                             |
| Cost model       | `estimateMonthlyStorageCost`                                                                                     | Simple storage/request estimate for architecture decisions.                     |

## Function examples

### Secure upload for private enterprise files

```ts
const session = await createSecureBrowserUploadSession({
  bucket: "enterprise-documents",
  tenantId: "acme-bank",
  userId: "user-123",
  category: "loan-applications",
  fileName: "income-proof.pdf",
  contentType: "application/pdf",
  maxBytes: 10 * 1024 * 1024,
  expiresInSeconds: 300,
});
```

Use this pattern when an API authenticates with Cognito, validates tenant membership, then lets browser upload directly to private S3. In production, pair with IAM least privilege, KMS encryption, object-size validation, malware scanning, and audit logging.

### Audit log for compliance

```ts
await writeAuditLogEntry("audit-bucket", {
  eventId: "evt-1",
  timestamp: new Date().toISOString(),
  tenantId: "acme-bank",
  actorId: "user-123",
  action: "ContractDownloaded",
  bucket: "enterprise-documents",
  key: "tenants/acme-bank/users/user-123/contracts/msa.pdf",
  outcome: "ALLOW",
  requestId: "req-789",
});
```

### Lifecycle and cost controls

```ts
await putLifecycleExpirationRule({
  bucket: "enterprise-documents",
  id: "expire-temp-after-7-days",
  prefix: "tmp/",
  days: 7,
});

const estimate = estimateMonthlyStorageCost({
  storageGb: 250,
  putRequests: 500_000,
  getRequests: 2_000_000,
});
```

### Backup and restore manifest

```ts
await enableVersioning("enterprise-documents");
const manifest = await writeBackupManifest(
  "enterprise-documents",
  "tenants/acme-bank/critical/",
);
```

## Real-world scenarios

- **File upload/download workflows** - API returns presigned URLs; browser uploads directly to S3; backend stores metadata in DynamoDB/RDS.
- **Secure access patterns** - private buckets, tenant/user key prefixes, short URL expiry, signed content type, KMS encryption, least-privilege IAM.
- **Multi-user SaaS storage** - keys use `tenants/{tenantId}/users/{userId}/...`; logs and metrics include tenant context.
- **Audit logging** - write access events to `audit/tenant=.../date=...` and ship to CloudWatch/OpenSearch/SIEM in production.
- **Error handling and retries** - use SDK retries plus `putObjectWithRetry` for controlled transient upload retry examples.
- **Data lifecycle management** - expire `tmp/`, `imports/`, and `exports/`; archive or replicate long-term records.
- **Event-driven processing** - S3 object-created events can trigger Lambda, EventBridge, SQS, Step Functions, Textract, or Bedrock workflows.
- **Monitoring and observability** - emit structured logs, business metrics, CloudWatch alarms, and S3 request/audit metrics.
- **Cost optimization** - model storage/request cost, expire temp data, prefer direct-to-S3 uploads, choose storage class intentionally.
- **Backup and DR** - enable versioning, store manifests, replicate critical prefixes, test restore drills.
- **Compliance** - classify objects, encrypt sensitive data, retain audit evidence, enforce tag and lifecycle policies.

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab bucket: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Run examples with `pnpm exec tsx src/examples/<file>.ts`.
7. Cleanup: `pnpm cleanup`.

## Testing guidance

- Run `pnpm test` with Floci healthy before changing helpers.
- Cover object CRUD, JSON parsing, lifecycle rules, versioning, presigned URLs, tenant key generation, audit logs, backup manifests, and retry paths.
- For production apps, add auth tests for tenant isolation, bad content types, oversized uploads, denied downloads, and audit evidence.

## Production checklist

- [ ] Buckets private with S3 Block Public Access.
- [ ] IAM policies scoped by bucket/prefix and least privilege.
- [ ] Sensitive objects encrypted with KMS.
- [ ] Presigned URLs short-lived and tenant/user scoped.
- [ ] Lifecycle rules set for temp/export/archive prefixes.
- [ ] Versioning, backup manifests, and restore drills enabled for critical data.
- [ ] Audit logs capture actor, tenant, action, resource, request ID, and outcome.
- [ ] CloudWatch metrics/alarms track errors, latency, object volume, and cost.

## Gotchas

- Bucket cleanup must delete object versions and delete markers before deleting bucket.
- Real S3 bucket names are globally unique; Floci names only need local uniqueness.
- Presigned URLs inherit creator permissions. Keep expiry short and scope keys by tenant/user.
- `ListObjectsV2` is paginated. Never assume one response contains all keys.
- JSON helpers validate transport only; validate parsed shape at API boundaries.
- `maxBytes` in secure upload sessions is an application contract; enforce it in API/browser and production bucket policies where possible.
- Cost estimates are illustrative. Use AWS Pricing API or Cost Explorer for real decisions.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, add least-privilege IAM, KMS/default encryption, S3 Block Public Access, CloudTrail data events or access logs, lifecycle/cost controls, Object Ownership, bucket policies, replication, and CloudFront for public distribution. Real AWS also has global bucket namespace, service quotas, request/transfer/storage costs, and control-plane timing differences.
