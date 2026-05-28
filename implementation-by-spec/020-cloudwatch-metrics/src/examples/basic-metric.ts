#!/usr/bin/env tsx
import { emfMetric, putMetric } from "../use-cases/metrics.js";
await putMetric("Floci/Example","Requests",1);
console.log(emfMetric("Floci/Example",{Requests:1},{Service:"api"}));
