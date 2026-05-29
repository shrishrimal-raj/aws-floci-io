#!/usr/bin/env tsx
import {
  createBrowserUploadSession,
  createBucket,
  deleteBucket,
} from "../use-cases/object-storage.js";

const bucket = `floci-s3-browser-${Date.now()}`;
const key = "uploads/avatar.png";

await createBucket(bucket);

const session = await createBrowserUploadSession(bucket, key, 300);
console.log({
  key: session.key,
  expiresInSeconds: session.expiresInSeconds,
  requiredHeaders: session.requiredHeaders,
  putUrlHasSignature: session.putUrl.includes("X-Amz-Signature"),
  getUrlHasSignature: session.getUrl.includes("X-Amz-Signature"),
});

await deleteBucket(bucket);
