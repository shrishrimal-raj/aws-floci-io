#!/usr/bin/env tsx
import { putManagedRule } from "../src/use-cases/compliance.js";
await putManagedRule("floci-required-config-rule");
console.log("Setup AWS Config rule floci-required-config-rule");
