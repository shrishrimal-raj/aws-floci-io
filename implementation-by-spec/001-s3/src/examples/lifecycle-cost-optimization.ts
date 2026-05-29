#!/usr/bin/env tsx
import {
  createBucket,
  deleteBucket,
  estimateMonthlyStorageCost,
  getLifecycleRuleIds,
  putLifecycleExpirationRule,
  putObjectWithRetry,
} from "../use-cases/object-storage.js";

const bucket = `floci-s3-lifecycle-cost-${Date.now()}`;

await createBucket(bucket);

await putLifecycleExpirationRule({
  bucket,
  id: "expire-temp-uploads-after-7-days",
  prefix: "tmp/",
  days: 7,
});

await putObjectWithRetry(
  {
    bucket,
    key: "tmp/acme/imports/customer-upload.csv",
    body: "id,name\n1,Ada\n",
    contentType: "text/csv",
    metadata: { tenantId: "acme", classification: "internal" },
  },
  { attempts: 3, baseDelayMs: 50 },
);

const estimate = estimateMonthlyStorageCost({
  storageGb: 250,
  putRequests: 500_000,
  getRequests: 2_000_000,
});

console.log({
  lifecycleRules: await getLifecycleRuleIds(bucket),
  estimate,
  lesson:
    "expire temporary prefixes and model request/storage cost before production launch",
});

await deleteBucket(bucket);
