#!/usr/bin/env tsx
import {
  estimateSecretsManagerMonthlyCost,
  redactSecretDeep,
  secretLifecycleDecision,
  type SecretMetadata,
} from "../use-cases/secrets.js";

/**
 * Enterprise pattern: lifecycle review + cost forecast + safe diagnostics without AWS calls.
 */
const metadata: SecretMetadata = {
  name: "prod/tenant-a/stripe",
  lastChangedDate: new Date("2026-01-01T00:00:00.000Z"),
  lastAccessedDate: new Date("2025-01-01T00:00:00.000Z"),
};

console.log({
  lifecycle: secretLifecycleDecision(metadata, { rotateAfterDays: 90, deleteIfUnusedAfterDays: 365 }, new Date("2026-05-30T00:00:00.000Z")),
  monthlyCostUsd: estimateSecretsManagerMonthlyCost(1_000, 250_000),
  safeDiagnostic: redactSecretDeep({ oauth: { clientId: "abc", clientSecret: "secret" }, scopes: ["read", "write"] }),
});
