#!/usr/bin/env tsx
import {
  createBucket,
  createPresignedGetUrl,
  deleteBucket,
  getObjectAsString,
  listObjects,
  putObject,
} from "../use-cases/object-storage.js";

const bucket = `floci-s3-example-${Date.now()}`;
const key = "notes/hello.txt";

await createBucket(bucket);
await putObject({ bucket, key, body: "hello from Floci S3", contentType: "text/plain" });

console.log(await getObjectAsString(bucket, key));
console.log(await listObjects(bucket, "notes/"));
console.log(await createPresignedGetUrl(bucket, key, 60));

await deleteBucket(bucket);
