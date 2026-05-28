#!/usr/bin/env tsx
import { deleteParameter } from "../src/use-cases/parameters.js";
const parameterName = process.env.SSM_PARAMETER_NAME ?? "/floci/ssm/lab/config";
await deleteParameter(parameterName);
console.log(`Cleanup SSM parameter ${parameterName}`);
