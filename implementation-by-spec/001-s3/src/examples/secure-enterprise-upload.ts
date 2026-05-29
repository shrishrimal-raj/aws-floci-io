#!/usr/bin/env tsx
import {
  createBucket,
  createSecureBrowserUploadSession,
  deleteBucket,
  tenantObjectKey,
} from "../use-cases/object-storage.js";

const bucket = `floci-s3-secure-upload-${Date.now()}`;

await createBucket(bucket);

const key = tenantObjectKey({
  tenantId: "acme-bank",
  userId: "user-123",
  category: "loan-applications",
  fileName: "income-proof.pdf",
});

const session = await createSecureBrowserUploadSession({
  bucket,
  tenantId: "acme-bank",
  userId: "user-123",
  category: "loan-applications",
  fileName: "income-proof.pdf",
  contentType: "application/pdf",
  maxBytes: 10 * 1024 * 1024,
  expiresInSeconds: 300,
  metadata: {
    classification: "confidential",
    workflow: "loan-underwriting",
  },
});

console.log({
  purpose: "private browser upload without exposing AWS credentials",
  key,
  sessionKey: session.key,
  expiresInSeconds: session.expiresInSeconds,
  requiredHeaders: session.requiredHeaders,
  maxBytes: session.maxBytes,
  putUrlHasSignature: session.putUrl.includes("X-Amz-Signature"),
});

await deleteBucket(bucket);
