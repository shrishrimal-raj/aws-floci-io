#!/usr/bin/env tsx
import { createDomain, deleteDomain, indexMapping } from "../use-cases/domains.js";
const name = `floci-search-${Date.now()}`;
console.log(indexMapping({title:"text"}));
await createDomain(name); await deleteDomain(name);
