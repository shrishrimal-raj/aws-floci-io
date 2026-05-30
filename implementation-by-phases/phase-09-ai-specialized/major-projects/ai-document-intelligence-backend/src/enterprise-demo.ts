#!/usr/bin/env tsx
import { allDocumentIntelligenceUseCases } from "../../../src/index.js";

console.log("AI Document Intelligence - enterprise use cases");
for (const useCase of allDocumentIntelligenceUseCases()) {
  console.log(JSON.stringify(useCase, null, 2));
}
