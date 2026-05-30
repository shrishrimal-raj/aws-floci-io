export interface TextractBlock {
  blockType: "LINE" | "KEY_VALUE_SET" | "TABLE";
  text?: string;
  confidence?: number;
}

export interface DocumentAnalysis {
  documentId: string;
  text: string;
  summaryPrompt: string;
  searchDocument: { id: string; body: string; metadata: Record<string, unknown> };
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  variants?: Record<string, number>;
}

/**
 * Builds structured Bedrock summarization prompt.
 * Example: send extracted invoice or claim text and require JSON with title, bullets, and risks.
 */
export function buildBedrockSummaryPrompt(text: string, maxBullets = 5): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return `Summarize document in ${maxBullets} bullets. Return JSON with keys: title, bullets, risks. Document: ${trimmed}`;
}

/**
 * Extracts high-confidence LINE text from Textract blocks.
 * Example: ignore noisy OCR lines before embedding, summarizing, or indexing document text.
 */
export function extractLines(blocks: TextractBlock[], minConfidence = 80): string[] {
  return blocks
    .filter((block) => block.blockType === "LINE" && (block.confidence ?? 100) >= minConfidence && block.text)
    .map((block) => block.text as string);
}

/**
 * Creates search-ready document analysis from Textract output.
 * Example: build OpenSearch document body and metadata after Textract async job finishes.
 */
export function createDocumentAnalysis(documentId: string, blocks: TextractBlock[], metadata: Record<string, unknown> = {}): DocumentAnalysis {
  const text = extractLines(blocks).join("\n");
  return {
    documentId,
    text,
    summaryPrompt: buildBedrockSummaryPrompt(text),
    searchDocument: {
      id: documentId,
      body: text,
      metadata: { source: "textract", lineCount: text ? text.split("\n").length : 0, ...metadata },
    },
  };
}

/**
 * Evaluates AppConfig-style percentage rollout for tenant-safe AI features.
 * Example: enable Bedrock summary for 10% of tenants while keeping extract-only fallback active.
 */
export function evaluateFeatureFlag(flag: FeatureFlag, context: { tenantId: string }): boolean {
  if (!flag.enabled) return false;
  if (!flag.variants?.enabledPercent) return true;
  const bucket = [...context.tenantId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;
  return bucket < flag.variants.enabledPercent;
}

/**
 * Builds CloudFront signed URL policy payload.
 * Example: issue 15-minute PDF download access after API authorizes tenant/document ownership.
 */
export function cloudFrontSignedUrlPolicy(resourceUrl: string, expiresAtEpochSeconds: number): Record<string, unknown> {
  if (expiresAtEpochSeconds <= Math.floor(Date.now() / 1000)) throw new Error("expiration must be in future");
  return {
    Statement: [
      {
        Resource: resourceUrl,
        Condition: { DateLessThan: { "AWS:EpochTime": expiresAtEpochSeconds } },
      },
    ],
  };
}

/**
 * Builds stable MSK consumer group id for document processing workers.
 * Example: `doc-intel.prod.documents.v1` consumes replayable document events in production.
 */
export function kafkaConsumerGroupId(app: string, environment: string): string {
  return `${app}.${environment}.documents.v1`;
}
