# 001 - S3

> Object storage with buckets, keys, versioning, lifecycle rules, and presigned URLs.

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
- `src/use-cases/object-storage.ts` - production-style use cases.
- `src/examples/basic-object-storage.ts` - runnable end-to-end example.
- `scripts/setup.ts` - creates `floci-s3-lab`, enables versioning, writes lifecycle rule.
- `scripts/seed.ts` - uploads fixture object.
- `scripts/cleanup.ts` - empties and deletes created bucket.

## Use cases

```ts
import {
  createBucket,
  putObject,
  getObjectAsString,
  listObjects,
  createPresignedGetUrl,
  deleteBucket,
} from "./src/index.js";

await createBucket("my-bucket");
await putObject({ bucket: "my-bucket", key: "docs/readme.txt", body: "hello" });
console.log(await getObjectAsString("my-bucket", "docs/readme.txt"));
console.log(await listObjects("my-bucket", "docs/"));
console.log(await createPresignedGetUrl("my-bucket", "docs/readme.txt", 900));
await deleteBucket("my-bucket");
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision lab bucket: `pnpm setup`.
4. Seed fixtures: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup: `pnpm cleanup`.

## Floci vs Real AWS

Floci support: **full** for this lab. On real AWS, prefer least-privilege IAM, globally unique bucket names, encryption defaults, bucket policies, access logging, lifecycle/cost controls, and private buckets with presigned URLs or CloudFront.
