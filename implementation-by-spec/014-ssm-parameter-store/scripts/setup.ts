#!/usr/bin/env tsx
import { putJsonParameter } from "../src/use-cases/parameters.js";
export const parameterName = process.env.SSM_PARAMETER_NAME ?? "/floci/ssm/lab/config";
await putJsonParameter(parameterName,{env:"local",feature:true});
console.log(`Setup SSM parameter ${parameterName}`);
