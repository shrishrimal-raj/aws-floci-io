#!/usr/bin/env tsx
import { requiredTagsRule } from "../use-cases/compliance.js";
console.log(requiredTagsRule(["Service","Environment"]));
