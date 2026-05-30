import { buildBedrockSummaryPrompt, cloudFrontSignedUrlPolicy, createDocumentAnalysis, evaluateFeatureFlag, kafkaConsumerGroupId, type FeatureFlag, type TextractBlock } from "./document-intelligence.js";
import { createTransferUserMapping, parseIncomingDocumentKey, shouldStartTextract } from "./transfer-ingest.js";
import {
  aiDisasterRecoveryPlan,
  aiLifecyclePolicy,
  aiProcessingPipeline,
  createAuditRecord,
  documentIngestedEvent,
  estimateAiDocumentCost,
  observabilityForAnalysis,
  tenantDocumentAccessPolicy,
} from "./ai-enterprise-patterns.js";

export interface UseCaseSummary {
  name: string;
  description: string;
  functions: string[];
  example: Record<string, unknown>;
}

const sampleBlocks: TextractBlock[] = [
  { blockType: "LINE", text: "Invoice INV-1001", confidence: 99 },
  { blockType: "LINE", text: "Vendor: Acme Medical Supplies", confidence: 98 },
  { blockType: "LINE", text: "Total: $4,250.00", confidence: 97 },
  { blockType: "LINE", text: "blurred footer", confidence: 42 },
];

/**
 * Example: secure SFTP intake for tenant PDFs.
 * Shows Transfer Family mapping, S3 key parsing, Textract routing decision, and ingest event creation.
 */
export function sftpIntakeUseCase(): UseCaseSummary {
  const mapping = createTransferUserMapping("hospital-a", "claims-dropbox", "ai-documents", "arn:aws:iam::123456789012:role/transfer-hospital-a");
  const ingested = parseIncomingDocumentKey("tenants/hospital-a/incoming/claim-1001.pdf");
  return {
    name: "SFTP tenant document intake",
    description: "Partner uploads PDFs through Transfer Family into tenant-scoped S3 prefix; EventBridge starts AI pipeline.",
    functions: ["createTransferUserMapping", "parseIncomingDocumentKey", "shouldStartTextract", "documentIngestedEvent"],
    example: { mapping, ingested, startTextract: shouldStartTextract(ingested), event: documentIngestedEvent(ingested, "corr-claim-1001") },
  };
}

/**
 * Example: invoice intelligence using Textract and Bedrock prompt generation.
 * Shows confident line extraction, prompt creation, search document metadata, and observability envelope.
 */
export function invoiceIntelligenceUseCase(): UseCaseSummary {
  const analysis = createDocumentAnalysis("invoice-1001", sampleBlocks, { tenantId: "finance-a", documentType: "invoice" });
  return {
    name: "Invoice intelligence",
    description: "Extract text from invoice, summarize through Bedrock, index search-ready document, and emit metrics.",
    functions: ["createDocumentAnalysis", "extractLines", "buildBedrockSummaryPrompt", "observabilityForAnalysis"],
    example: { analysis, prompt: buildBedrockSummaryPrompt(analysis.text, 4), observability: observabilityForAnalysis(analysis, "bedrock-summary", 380) },
  };
}

/**
 * Example: feature-gated AI rollout by tenant.
 * Shows AppConfig-style percentage rollout and safe fallback when AI is disabled.
 */
export function controlledAiRolloutUseCase(flag: FeatureFlag = { key: "bedrock-summary", enabled: true, variants: { enabledPercent: 40 } }): UseCaseSummary {
  const tenantId = "tenant-alpha";
  const aiEnabled = evaluateFeatureFlag(flag, { tenantId });
  return {
    name: "Controlled AI rollout",
    description: "Roll out Bedrock summaries gradually by tenant and fall back to extract-only indexing.",
    functions: ["evaluateFeatureFlag", "buildBedrockSummaryPrompt"],
    example: { tenantId, aiEnabled, fallback: aiEnabled ? "generate-summary" : "index-extracted-text-only" },
  };
}

/**
 * Example: secure document delivery with CloudFront.
 * Shows signed URL policy and tenant-scoped access policy for raw PDFs.
 */
export function secureDeliveryUseCase(nowEpochSeconds = Math.floor(Date.now() / 1000)): UseCaseSummary {
  return {
    name: "Secure document delivery",
    description: "Users query metadata through API and receive short-lived CloudFront URL for authorized PDF access.",
    functions: ["cloudFrontSignedUrlPolicy", "tenantDocumentAccessPolicy", "createAuditRecord"],
    example: {
      cdnPolicy: cloudFrontSignedUrlPolicy("https://cdn.example.com/tenants/finance-a/invoices/invoice-1001.pdf", nowEpochSeconds + 900),
      accessPolicy: tenantDocumentAccessPolicy("finance-a", "arn:aws:s3:::ai-documents", "arn:aws:iam::123456789012:role/finance-a-reader"),
      audit: createAuditRecord({
        eventId: "evt-url-1001",
        tenantId: "finance-a",
        actor: "api-user-42",
        action: "CreateSignedUrl",
        resource: "invoice-1001",
        outcome: "ALLOW",
        correlationId: "corr-url-1001",
      }),
    },
  };
}

/**
 * Example: production operations plan.
 * Shows pipeline stages, MSK group id, lifecycle, cost planning, and disaster recovery.
 */
export function productionOperationsUseCase(): UseCaseSummary {
  return {
    name: "Production operations",
    description: "Operate AI document platform with event stages, replay consumers, retention, cost controls, and backups.",
    functions: ["aiProcessingPipeline", "kafkaConsumerGroupId", "aiLifecyclePolicy", "estimateAiDocumentCost", "aiDisasterRecoveryPlan"],
    example: {
      pipeline: aiProcessingPipeline("ai-documents", "documents-prod"),
      consumerGroup: kafkaConsumerGroupId("doc-intel", "prod"),
      lifecycle: aiLifecyclePolicy(true),
      cost: estimateAiDocumentCost(50_000, 3),
      disasterRecovery: aiDisasterRecoveryPlan("doc-intel", "prod"),
    },
  };
}

/** Returns all hands-on enterprise use cases for demos and README parity checks. */
export function allDocumentIntelligenceUseCases(): UseCaseSummary[] {
  return [sftpIntakeUseCase(), invoiceIntelligenceUseCase(), controlledAiRolloutUseCase(), secureDeliveryUseCase(), productionOperationsUseCase()];
}
