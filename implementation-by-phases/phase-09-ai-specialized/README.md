# Phase 09 - AI, Documents, Specialized Services

Enterprise AI document-intelligence backend using Transfer Family, S3, Textract, Bedrock, OpenSearch-style search documents, AppConfig-style flags, CloudFront, and MSK naming patterns.

## What you learn

- Ingest tenant PDFs securely through SFTP/API prefixes.
- Extract trusted text with Textract helpers and prepare Bedrock summary prompts.
- Build search-ready document records with tenant metadata.
- Gate AI features safely by tenant rollout percentage.
- Issue short-lived CloudFront policies for document delivery.
- Add retries, audit logs, event-driven stages, lifecycle, observability, cost planning, and disaster recovery.

## Function map

| Area | Main functions/classes | Practical use case |
| --- | --- | --- |
| Transfer ingest | `createTransferUserMapping`, `parseIncomingDocumentKey`, `shouldStartTextract` | Partner uploads claim/invoice PDFs to tenant-scoped SFTP home. |
| Document AI | `extractLines`, `buildBedrockSummaryPrompt`, `createDocumentAnalysis` | Convert Textract blocks into clean text, summary prompt, and search document. |
| Rollout/delivery | `evaluateFeatureFlag`, `cloudFrontSignedUrlPolicy`, `kafkaConsumerGroupId` | Tenant-safe AI rollout, secure PDF URL, replayable MSK consumers. |
| Enterprise controls | `withAiRetry`, `createAuditRecord`, `tenantDocumentAccessPolicy`, `documentIngestedEvent`, `aiProcessingPipeline`, `observabilityForAnalysis` | Secure access, audit logging, retry/error handling, event-driven processing, monitoring. |
| Operations | `aiLifecyclePolicy`, `estimateAiDocumentCost`, `aiDisasterRecoveryPlan` | Retention, cost optimization, backup, replay, and DR planning. |
| Use cases | `sftpIntakeUseCase`, `invoiceIntelligenceUseCase`, `controlledAiRolloutUseCase`, `secureDeliveryUseCase`, `productionOperationsUseCase` | Hands-on enterprise examples in `src/document-use-cases.ts`. |

## Real-world examples

- `major-projects/ai-document-intelligence-backend/src/demo.ts` - quick tour.
- `major-projects/ai-document-intelligence-backend/src/enterprise-demo.ts` - all enterprise use cases.
- `major-projects/ai-document-intelligence-backend/src/compliance-demo.ts` - regulated loan/claims processing with audit, IAM, lifecycle, DR.
- `major-projects/ai-document-intelligence-backend/src/operations-demo.ts` - event pipeline, MSK consumer, and cost plan.

## Run

```bash
pnpm install
pnpm --filter @floci-lab/phase-09 test
pnpm --filter @floci-lab/phase-09 typecheck
pnpm --filter @floci-lab/phase-09 lab
pnpm --filter @floci-lab/phase-09 lab:enterprise
pnpm --filter @floci-lab/phase-09 lab:compliance
pnpm --filter @floci-lab/phase-09 lab:operations
```

## Production checklist

- Scope SFTP, S3, search, and URL access by tenant and principal tags.
- Audit uploads, Textract starts, Bedrock calls, search queries, signed URLs, denials, and DLQ replays.
- Retry transient Textract/Bedrock/OpenSearch/MSK failures; quarantine invalid or unsupported files.
- Keep raw documents, extracted text, embeddings, and search indexes on explicit lifecycle policies.
- Emit correlation IDs, tenant/stage dimensions, latency, line count, empty extraction, error metrics, and cost signals.
- Use MSK/EventBridge replay topics for failed stages and disaster recovery.
- Estimate Textract pages, Bedrock requests, embeddings, and storage before production launch.
