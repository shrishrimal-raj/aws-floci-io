import { describe, expect, it, vi } from "vitest";
import {
  aiDisasterRecoveryPlan,
  aiLifecyclePolicy,
  aiProcessingPipeline,
  createAuditRecord,
  createDocumentAnalysis,
  documentIngestedEvent,
  estimateAiDocumentCost,
  observabilityForAnalysis,
  tenantDocumentAccessPolicy,
  withAiRetry,
} from "../src/index.js";

describe("AI enterprise patterns", () => {
  it("retries transient AI operations", async () => {
    const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error("throttled"), { name: "ThrottlingException" })).mockResolvedValue("ok");
    await expect(withAiRetry(operation, { maxAttempts: 2, baseDelayMs: 1, backoffRate: 2, retryableErrors: ["ThrottlingException"] })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("builds audit, access, event, pipeline, observability, lifecycle, cost, and DR outputs", () => {
    const event = { tenantId: "tenant-a", key: "tenants/tenant-a/incoming/invoice.pdf", source: "sftp" as const, contentType: "application/pdf" };
    const analysis = createDocumentAnalysis("doc-1", [{ blockType: "LINE", text: "Total $42", confidence: 99 }], { tenantId: "tenant-a" });

    expect(createAuditRecord({ eventId: "e1", tenantId: "tenant-a", actor: "svc", action: "Analyze", resource: "doc-1", outcome: "ALLOW", correlationId: "c1" }).at).toBeTruthy();
    expect(tenantDocumentAccessPolicy("tenant-a", "arn:aws:s3:::docs", "arn:role")).toMatchObject({ Version: "2012-10-17" });
    expect(documentIngestedEvent(event, "corr-1")).toMatchObject({ source: "ai.documents.ingest", "detail-type": "DocumentIngested" });
    expect(aiProcessingPipeline("docs", "documents")).toHaveLength(6);
    expect(observabilityForAnalysis(analysis, "textract", 100)).toMatchObject({ tenantId: "tenant-a" });
    expect(aiLifecyclePolicy(true).rawDocumentRetentionDays).toBeGreaterThan(aiLifecyclePolicy(false).rawDocumentRetentionDays);
    expect(estimateAiDocumentCost(100, 3)).toMatchObject({ estimatedTextractPages: 300, estimatedBedrockRequests: 100 });
    expect(aiDisasterRecoveryPlan("doc-intel", "prod").replayTopic).toContain("documents.replay.v1");
  });
});
