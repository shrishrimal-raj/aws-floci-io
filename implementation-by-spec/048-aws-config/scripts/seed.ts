#!/usr/bin/env tsx
import { requiredTagsRule } from "../src/use-cases/compliance.js";
console.log(requiredTagsRule(["Service","Environment"]));
