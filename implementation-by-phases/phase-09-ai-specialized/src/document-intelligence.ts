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

export function buildBedrockSummaryPrompt(text: string, maxBullets = 5): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return `Summarize document in ${maxBullets} bullets. Return JSON with keys: title, bullets, risks. Document: ${trimmed}`;
}

export function extractLines(blocks: TextractBlock[], minConfidence = 80): string[] {
  return blocks
    .filter((block) => block.blockType === "LINE" && (block.confidence ?? 100) >= minConfidence && block.text)
    .map((block) => block.text as string);
}

export function createDocumentAnalysis(documentId: string, blocks: TextractBlock[]): DocumentAnalysis {
  const text = extractLines(blocks).join("\n");
  return {
    documentId,
    text,
    summaryPrompt: buildBedrockSummaryPrompt(text),
    searchDocument: {
      id: documentId,
      body: text,
      metadata: { source: "textract", lineCount: text ? text.split("\n").length : 0 },
    },
  };
}

export function evaluateFeatureFlag(flag: FeatureFlag, context: { tenantId: string }): boolean {
  if (!flag.enabled) return false;
  if (!flag.variants?.enabledPercent) return true;
  const bucket = [...context.tenantId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;
  return bucket < flag.variants.enabledPercent;
}

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

export function kafkaConsumerGroupId(app: string, environment: string): string {
  return `${app}.${environment}.documents.v1`;
}
