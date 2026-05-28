#!/usr/bin/env tsx
import {
  createBucket,
  enableVersioning,
  putLifecycleExpirationRule,
} from "../src/use-cases/object-storage.js";

export const bucket = process.env.S3_BUCKET ?? "floci-s3-lab";

await createBucket(bucket);
await enableVersioning(bucket);
await putLifecycleExpirationRule({
  bucket,
  id: "expire-temp-objects",
  prefix: "tmp/",
  days: 7,
});

console.log(`Setup S3 bucket ${bucket}`);
