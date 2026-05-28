#!/usr/bin/env tsx
import { namespace } from "./setup.js";
import { putMetric } from "../src/use-cases/metrics.js";
await putMetric(namespace,"Requests",1);
console.log(`Seed CloudWatch Metrics ${namespace}`);
