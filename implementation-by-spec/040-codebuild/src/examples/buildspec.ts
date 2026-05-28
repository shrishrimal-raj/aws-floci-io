#!/usr/bin/env tsx
import { buildspec } from "../use-cases/builds.js";
console.log(buildspec(["pnpm install","pnpm test"]));
