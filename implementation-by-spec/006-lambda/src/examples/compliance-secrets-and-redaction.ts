#!/usr/bin/env tsx
import {
  createFunction,
  deleteFunction,
  redactSensitiveEnv,
  serviceFunctionSpec,
} from "../use-cases/functions.js";

const functionName = `floci-lambda-compliance-secrets-${Date.now()}`;

const env = {
  SERVICE_NAME: "billing-api",
  SECRET_ARN: "arn:aws:secretsmanager:us-east-1:000000000000:secret:billing-api",
  DB_PASSWORD: "never-log-me",
  API_TOKEN: "never-log-me-either",
  LOG_LEVEL: "info",
};

await createFunction(
  serviceFunctionSpec(functionName, env, { timeoutSeconds: 10, memoryMb: 256 }),
);

try {
  console.log({
    compliancePattern:
      "sensitive config references are kept in Secrets Manager/KMS and logs are redacted",
    redactedEnvironment: redactSensitiveEnv(env),
    controls: [
      "least-privilege execution role",
      "no plaintext secrets in logs",
      "KMS for encrypted config",
      "audit every privileged action",
    ],
  });
} finally {
  await deleteFunction(functionName);
}
