#!/usr/bin/env tsx
import { deleteDomain } from "../src/use-cases/domains.js";
const domainName = process.env.OPENSEARCH_DOMAIN ?? "floci-search-lab";
await deleteDomain(domainName);
console.log(`Cleanup OpenSearch domain ${domainName}`);
