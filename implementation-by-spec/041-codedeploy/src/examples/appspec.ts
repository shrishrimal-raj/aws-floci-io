#!/usr/bin/env tsx
import { appspec } from "../use-cases/deployments.js";
console.log(appspec([{source:"/",destination:"/app"}]));
