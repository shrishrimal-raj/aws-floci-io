#!/usr/bin/env tsx
import { cacheBehavior } from "../use-cases/distributions.js";
console.log(cacheBehavior("/api/*","api"));
