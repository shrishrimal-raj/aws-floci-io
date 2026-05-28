#!/usr/bin/env tsx
import { listenerRulePath } from "../use-cases/load-balancers.js";
console.log(listenerRulePath("/api/*"));
