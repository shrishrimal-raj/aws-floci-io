#!/usr/bin/env tsx
import { deleteAlarms } from "../src/use-cases/metrics.js";
await deleteAlarms(["floci-lab-errors"]);
console.log("Cleanup CloudWatch Metrics alarms");
