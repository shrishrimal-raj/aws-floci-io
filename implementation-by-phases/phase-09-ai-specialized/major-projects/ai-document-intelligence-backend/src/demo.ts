#!/usr/bin/env tsx
import {
  cloudFrontSignedUrlPolicy,
  createDocumentAnalysis,
  evaluateFeatureFlag,
  kafkaConsumerGroupId,
} from "../../../src/index.js";

const analysis = createDocumentAnalysis("invoice-001", [
  { blockType: "LINE", text: "Invoice #001", confidence: 99 },
  { blockType: "LINE", text: "Total: $42.00", confidence: 98 },
  { blockType: "LINE", text: "low confidence noise", confidence: 40 },
]);

const aiEnabled = evaluateFeatureFlag({ key: "bedrock-summary", enabled: true, variants: { enabledPercent: 50 } }, { tenantId: "tenant-a" });
const cdnPolicy = cloudFrontSignedUrlPolicy("https://cdn.example.com/tenant-a/invoice-001.pdf", Math.floor(Date.now() / 1000) + 3600);

console.log("AI Document Intelligence Backend demo");
console.log(JSON.stringify({ analysis, aiEnabled, cdnPolicy, consumerGroup: kafkaConsumerGroupId("doc-intel", "dev") }, null, 2));
