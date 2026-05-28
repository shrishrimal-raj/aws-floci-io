#!/usr/bin/env tsx
import { allPassed, renderStatusBoard, runFlociSmokeTests } from "../../../src/smoke-tests.js";
import { logger } from "@floci-lab/logger";

const endpoint = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
process.env.AWS_ENDPOINT_URL = endpoint;
process.env.AWS_REGION ??= "us-east-1";
process.env.AWS_ACCESS_KEY_ID ??= "test";
process.env.AWS_SECRET_ACCESS_KEY ??= "test";
process.env.SERVICE_NAME ??= "floci-lab-bench";

logger.info({ endpoint }, "running Floci lab bench smoke tests");
const results = await runFlociSmokeTests();
console.log(renderStatusBoard(results));

if (!allPassed(results)) {
  logger.error({ results }, "Floci lab bench failed");
  process.exit(1);
}

logger.info("Floci lab bench passed");
