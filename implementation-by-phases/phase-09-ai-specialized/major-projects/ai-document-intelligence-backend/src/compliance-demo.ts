#!/usr/bin/env tsx
import {
  aiDisasterRecoveryPlan,
  aiLifecyclePolicy,
  createAuditRecord,
  createTransferUserMapping,
  parseIncomingDocumentKey,
  tenantDocumentAccessPolicy,
  withAiRetry,
} from "../../../src/index.js";

const ingest = parseIncomingDocumentKey("tenants/bank-a/incoming/loan-application.pdf");
const retryResult = await withAiRetry(async () => "textract-job-started", { maxAttempts: 3, baseDelayMs: 5, backoffRate: 2 });

console.log("Regulated AI document processing");
console.log(
  JSON.stringify(
    {
      transferUser: createTransferUserMapping("bank-a", "loan-dropbox", "ai-documents-prod", "arn:aws:iam::123456789012:role/transfer-bank-a"),
      ingest,
      retryResult,
      accessPolicy: tenantDocumentAccessPolicy("bank-a", "arn:aws:s3:::ai-documents-prod", "arn:aws:iam::123456789012:role/bank-a-worker"),
      audit: createAuditRecord({
        eventId: "evt-loan-1001",
        tenantId: "bank-a",
        actor: "loan-ai-worker",
        action: "StartTextractAnalysis",
        resource: ingest.key,
        outcome: "ALLOW",
        correlationId: "corr-loan-1001",
        metadata: { policy: "pci-sox", mfa: true },
      }),
      lifecycle: aiLifecyclePolicy(true),
      disasterRecovery: aiDisasterRecoveryPlan("loan-doc-ai", "prod"),
    },
    null,
    2
  )
);
