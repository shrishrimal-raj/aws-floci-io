#!/usr/bin/env tsx
import { createDomain } from "../src/use-cases/domains.js";
export const domainName = process.env.OPENSEARCH_DOMAIN ?? "floci-search-lab";
await createDomain(domainName);
console.log(`Setup OpenSearch domain ${domainName}`);
