import type { DocumentAnalysis } from "./document-intelligence.js";
import type { IngestedDocumentEvent } from "./transfer-ingest.js";

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  backoffRate: number;
  retryableErrors?: string[];
}

export interface AuditRecord {
  eventId: string;
  tenantId: string;
  actor: string;
  action: string;
  resource: string;
  outcome: "ALLOW" | "DENY" | "ERROR";
  correlationId: string;
  at: string;
  metadata?: Record<string, unknown>;
}

export interface AiProcessingStage {
  name: "ingest" | "textract" | "bedrock-summary" | "embedding" | "index" | "delivery";
  service: string;
  input: string;
  output: string;
  failureTarget: string;
}

export interface AiLifecyclePolicy {
  rawDocumentRetentionDays: number;
  extractedTextRetentionDays: number;
  embeddingRetentionDays: number;
  archiveAfterDays: number;
  purgeAfterDays: number;
}

export interface CostEstimate {
  documentsPerMonth: number;
  averagePages: number;
  estimatedTextractPages: number;
  estimatedBedrockRequests: number;
  estimatedEmbeddingRecords: number;
  optimizationTips: string[];
}

export interface DisasterRecoveryPlan {
  rawBucketBackup: string;
  searchSnapshotRepository: string;
  replayTopic: string;
  rpoMinutes: number;
  rtoMinutes: number;
}

/**
 * Runs idempotent AI pipeline work with exponential backoff.
 * Example: retry Textract status polling, Bedrock throttles, OpenSearch indexing, or MSK publishes.
 */
export async function withAiRetry<T>(operation: () => Promise<T>, policy: RetryPolicy): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < policy.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      const name = error instanceof Error ? error.name : "UnknownError";
      const canRetry = !policy.retryableErrors || policy.retryableErrors.includes(name);
      if (attempt >= policy.maxAttempts || !canRetry) break;
      const delay = Math.round(policy.baseDelayMs * policy.backoffRate ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Creates append-only audit record for AI document operations.
 * Example: log document upload, Textract start, Bedrock summary access, search query, and signed URL issuance.
 */
export function createAuditRecord(input: Omit<AuditRecord, "at"> & { at?: string }): AuditRecord {
  return { ...input, at: input.at ?? new Date().toISOString() };
}

/**
 * Builds tenant-scoped access policy shape for document objects.
 * Example: allow one tenant worker role to read/write only `tenants/{tenantId}/...` S3 objects.
 */
export function tenantDocumentAccessPolicy(tenantId: string, bucketArn: string, principalArn: string): Record<string, unknown> {
  const prefixArn = `${bucketArn}/tenants/${tenantId}/*`;
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "TenantScopedDocumentAccess",
        Effect: "Allow",
        Principal: { AWS: principalArn },
        Action: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        Resource: [bucketArn, prefixArn],
        Condition: { StringEquals: { "aws:PrincipalTag/tenantId": tenantId } },
      },
    ],
  };
}

/**
 * Creates EventBridge-style event after SFTP/API ingestion.
 * Example: route PDF uploads to Textract state machine and non-PDF files to quarantine review.
 */
export function documentIngestedEvent(event: IngestedDocumentEvent, correlationId: string): Record<string, unknown> {
  return {
    id: correlationId,
    source: "ai.documents.ingest",
    "detail-type": "DocumentIngested",
    detail: { ...event, correlationId },
  };
}

/**
 * Defines event-driven processing stages for AI document intelligence.
 * Example: implement each stage as Lambda/Step Functions tasks with DLQ targets and replay inputs.
 */
export function aiProcessingPipeline(documentBucket: string, searchIndex: string): AiProcessingStage[] {
  return [
    { name: "ingest", service: "Transfer Family + S3", input: `s3://${documentBucket}/tenants/*/incoming`, output: "DocumentIngested", failureTarget: "quarantine-prefix" },
    { name: "textract", service: "Textract", input: "DocumentIngested", output: "TextExtracted", failureTarget: "textract-dlq" },
    { name: "bedrock-summary", service: "Bedrock", input: "TextExtracted", output: "SummaryCreated", failureTarget: "bedrock-dlq" },
    { name: "embedding", service: "Bedrock embeddings", input: "TextExtracted", output: "EmbeddingCreated", failureTarget: "embedding-dlq" },
    { name: "index", service: "OpenSearch", input: "SummaryCreated + EmbeddingCreated", output: searchIndex, failureTarget: "index-dlq" },
    { name: "delivery", service: "CloudFront", input: "search result", output: "signed document URL", failureTarget: "access-audit-log" },
  ];
}

/**
 * Creates metrics/log envelope for one document analysis.
 * Example: emit these fields to CloudWatch for dashboards by tenant, stage, pages, latency, and low confidence count.
 */
export function observabilityForAnalysis(analysis: DocumentAnalysis, stage: string, latencyMs: number): Record<string, unknown> {
  const lowInformation = analysis.text.length === 0;
  return {
    correlationId: analysis.documentId,
    stage,
    tenantId: analysis.searchDocument.metadata.tenantId ?? "unknown",
    metrics: { latencyMs, lineCount: Number(analysis.searchDocument.metadata.lineCount ?? 0), emptyExtraction: lowInformation ? 1 : 0 },
    dimensions: { stage, source: String(analysis.searchDocument.metadata.source), documentId: analysis.documentId },
  };
}

/**
 * Defines retention policy for raw PDFs, extracted text, embeddings, and archives.
 * Example: fintech/compliance tenants keep raw and derived data longer than demo tenants.
 */
export function aiLifecyclePolicy(regulated: boolean): AiLifecyclePolicy {
  return regulated
    ? { rawDocumentRetentionDays: 2555, extractedTextRetentionDays: 2555, embeddingRetentionDays: 2555, archiveAfterDays: 90, purgeAfterDays: 2555 }
    : { rawDocumentRetentionDays: 365, extractedTextRetentionDays: 180, embeddingRetentionDays: 180, archiveAfterDays: 30, purgeAfterDays: 365 };
}

/**
 * Estimates monthly AI document workload and practical cost levers.
 * Example: forecast Textract page volume, Bedrock calls, embedding count, and optimization actions before launch.
 */
export function estimateAiDocumentCost(documentsPerMonth: number, averagePages: number): CostEstimate {
  return {
    documentsPerMonth,
    averagePages,
    estimatedTextractPages: documentsPerMonth * averagePages,
    estimatedBedrockRequests: documentsPerMonth,
    estimatedEmbeddingRecords: documentsPerMonth * Math.max(1, Math.ceil(averagePages / 2)),
    optimizationTips: [
      "Skip Bedrock summary for low-confidence or duplicate documents.",
      "Batch embeddings where service limits allow.",
      "Use S3 lifecycle to archive raw PDFs after active review window.",
      "Cache summaries and signed URL policy decisions by document version.",
    ],
  };
}

/**
 * Builds backup and disaster-recovery naming plan for AI document platform.
 * Example: create S3 backup, OpenSearch snapshot repository, and MSK replay topic per environment.
 */
export function aiDisasterRecoveryPlan(app: string, environment: string): DisasterRecoveryPlan {
  const prefix = `${app}-${environment}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  return {
    rawBucketBackup: `${prefix}-raw-documents-backup`,
    searchSnapshotRepository: `${prefix}-opensearch-snapshots`,
    replayTopic: `${prefix}.documents.replay.v1`,
    rpoMinutes: 15,
    rtoMinutes: 60,
  };
}
