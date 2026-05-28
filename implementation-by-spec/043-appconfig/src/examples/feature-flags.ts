#!/usr/bin/env tsx
import { featureFlags } from "../use-cases/config.js";
console.log(featureFlags({ checkout: true }));
