import { describe, expect, it } from "vitest";
import {
  allDocumentIntelligenceUseCases,
  controlledAiRolloutUseCase,
  invoiceIntelligenceUseCase,
  productionOperationsUseCase,
  secureDeliveryUseCase,
  sftpIntakeUseCase,
} from "../src/index.js";

describe("AI document intelligence use cases", () => {
  it("covers hands-on enterprise scenarios", () => {
    const useCases = allDocumentIntelligenceUseCases();
    expect(useCases.map((useCase) => useCase.name)).toEqual([
      "SFTP tenant document intake",
      "Invoice intelligence",
      "Controlled AI rollout",
      "Secure document delivery",
      "Production operations",
    ]);
  });

  it("demonstrates important functions in separate scenarios", () => {
    expect(sftpIntakeUseCase().functions).toContain("createTransferUserMapping");
    expect(invoiceIntelligenceUseCase().functions).toContain("buildBedrockSummaryPrompt");
    expect(controlledAiRolloutUseCase({ key: "ai", enabled: false }).example.fallback).toBe("index-extracted-text-only");
    expect(secureDeliveryUseCase(2_000_000_000).functions).toContain("cloudFrontSignedUrlPolicy");
    expect(productionOperationsUseCase().functions).toContain("estimateAiDocumentCost");
  });
});
