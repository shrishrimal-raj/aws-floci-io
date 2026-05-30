#!/usr/bin/env tsx
import { aiProcessingPipeline, estimateAiDocumentCost, kafkaConsumerGroupId, productionOperationsUseCase } from "../../../src/index.js";

console.log("AI document operations plan");
console.log(
  JSON.stringify(
    {
      pipeline: aiProcessingPipeline("ai-documents-prod", "documents-prod"),
      mskConsumerGroup: kafkaConsumerGroupId("doc-intel", "prod"),
      launchCostModel: estimateAiDocumentCost(75_000, 4),
      fullUseCase: productionOperationsUseCase(),
    },
    null,
    2
  )
);
