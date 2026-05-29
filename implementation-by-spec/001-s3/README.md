# 001 - S3

> Object storage with buckets, keys, versioning, lifecycle rules, JSON documents, and presigned URLs.

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
- `src/use-cases/object-storage.ts` - production-style object storage helpers.
- `src/examples/basic-object-storage.ts` - bucket + object CRUD + list + presigned GET.
- `src/examples/json-document-store.ts` - typed JSON document storage.
- `src/examples/browser-presigned-urls.ts` - browser upload/download URL session.
- `scripts/setup.ts` - creates `floci-s3-lab`, enables versioning, writes lifecycle rule.
- `scripts/seed.ts` - uploads fixture object.
- `scripts/cleanup.ts` - empties and deletes created bucket.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create bucket | `createBucket` | Idempotent for already-owned buckets. |
| Enable/read versioning | `enableVersioning`, `getVersioningStatus` | Protects overwrites/deletes; cleanup removes versions. |
| Lifecycle rule | `putLifecycleExpirationRule`, `getLifecycleRuleIds` | Prefix expiration for temp data. |
| Upload/read raw object | `putObject`, `getObjectAsString` | Supports content type and user metadata. |
| Upload/read JSON object | `putJsonObject`, `getJsonObject` | Common backend pattern for profiles, configs, exports. |
| Prefix listing | `listObjects` | Handles `ListObjectsV2` pagination. |
| Cleanup | `deleteObject`, `emptyBucket`, `deleteBucket` | Handles unversioned objects, versions, delete markers. |
| Browser access | `createPresignedPutUrl`, `createPresignedGetUrl`, `createBrowserUploadSession` | Private bucket, short-lived client access. |

## Use cases

```ts
import {
  createBucket,
  putJsonObject,
  getJsonObject,
  createBrowserUploadSession,
  deleteBucket,
} from "./src/index.js";

await createBucket("my-bucket");
await putJsonObject({ bucket: "my-bucket", key: "users/1.json", value: { id: "1", name: "Ada" } });
console.log(await getJsonObject<{ id: string; name: string }>("my-bucket", "users/1.json"));
console.log(await createBrowserUploadSession("my-bucket", "uploads/avatar.png", 900));
await deleteBucket("my-bucket");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab bucket: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup: `pnpm cleanup`.

## Gotchas

- Bucket cleanup must delete object versions and delete markers before deleting bucket.
- Real S3 bucket names are globally unique; Floci local names only need local uniqueness.
- Presigned URLs inherit creator permissions. Keep expiry short and scope keys by tenant/user.
- `ListObjectsV2` is paginated. Never assume one response contains all keys.
- JSON helpers validate transport only; validate parsed shape at API boundaries for production.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, use least-privilege IAM, default encryption, block public access, server access logs or CloudTrail data events, lifecycle/cost controls, S3 Object Ownership, bucket policies, and CloudFront for public distribution. Real AWS also has global bucket namespace, eventual consistency edge cases for some control-plane operations, and request/transfer/storage costs.
