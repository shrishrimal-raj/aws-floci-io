#!/usr/bin/env tsx
import { deleteBucket } from "../src/use-cases/object-storage.js";

const bucket = process.env.S3_BUCKET ?? "floci-s3-lab";

await deleteBucket(bucket);

console.log(`Cleanup S3 bucket ${bucket}`);
