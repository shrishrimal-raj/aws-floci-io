#!/usr/bin/env tsx
import { putAlarm, putDashboard } from "../src/use-cases/metrics.js";
export const namespace = process.env.METRIC_NAMESPACE ?? "Floci/Lab";
await putAlarm("floci-lab-errors",namespace,"Errors",1);
await putDashboard("floci-lab",[]);
console.log(`Setup CloudWatch Metrics ${namespace}`);
