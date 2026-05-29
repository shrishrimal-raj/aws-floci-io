#!/usr/bin/env tsx
import { appConfig, parameterPath } from "../use-cases/parameters.js";

const path = parameterPath("orders", "dev", "features");
console.log(appConfig(path, { checkoutV2: true }));
