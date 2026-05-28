#!/usr/bin/env tsx
import { getCallerIdentity } from "../src/use-cases/credentials.js";
console.log(await getCallerIdentity());
console.log("Setup STS identity check complete");
