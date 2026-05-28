import { describe, expect, it } from "vitest";
import { buildBedrockSummaryPrompt, cloudFrontSignedUrlPolicy, createDocumentAnalysis, evaluateFeatureFlag, extractLines, kafkaConsumerGroupId } from "../src/index.js";

describe("Phase 09 AI document intelligence helpers", () => {
  it("extracts confident Textract lines", () => {
    expect(extractLines([
      { blockType: "LINE", text: "Invoice #1", confidence: 99 },
      { blockType: "LINE", text: "blurred", confidence: 50 },
      { blockType: "TABLE", text: "ignored", confidence: 99 },
    ])).toEqual(["Invoice #1"]);
  });

  it("builds Bedrock structured summary prompt", () => {
    expect(buildBedrockSummaryPrompt("hello\nworld", 3)).toContain("Return JSON");
    expect(buildBedrockSummaryPrompt("hello\nworld", 3)).toContain("3 bullets");
  });

  it("creates search-ready document analysis", () => {
    const analysis = createDocumentAnalysis("doc-1", [{ blockType: "LINE", text: "Total $42", confidence: 98 }]);
    expect(analysis.searchDocument).toMatchObject({ id: "doc-1", body: "Total $42", metadata: { source: "textract", lineCount: 1 } });
  });

  it("evaluates AppConfig-style feature flag rollout", () => {
    expect(evaluateFeatureFlag({ key: "ai", enabled: false }, { tenantId: "a" })).toBe(false);
    expect(evaluateFeatureFlag({ key: "ai", enabled: true }, { tenantId: "a" })).toBe(true);
  });

  it("creates CloudFront signed URL policy and Kafka group id", () => {
    const policy = cloudFrontSignedUrlPolicy("https://cdn.example.com/a.pdf", Math.floor(Date.now() / 1000) + 60);
    expect(policy.Statement).toHaveLength(1);
    expect(kafkaConsumerGroupId("doc-ai", "dev")).toBe("doc-ai.dev.documents.v1");
  });
});
