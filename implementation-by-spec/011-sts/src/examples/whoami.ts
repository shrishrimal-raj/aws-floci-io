#!/usr/bin/env tsx
import { getCallerIdentity } from "../use-cases/credentials.js";
console.log(await getCallerIdentity());
