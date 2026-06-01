#!/usr/bin/env tsx
import {
  createFunctionIfMissing,
  createLambdaAuditEvent,
  deleteFunction,
  invokeForResult,
  serviceFunctionSpec,
} from "../use-cases/functions.js";

const functionName = `floci-lambda-dr-restore-${Date.now()}`;

const spec = serviceFunctionSpec(
  functionName,
  {
    SERVICE_NAME: "ledger-recovery",
    STATE_BUCKET: "ledger-state-backups",
    CHECKPOINT_TABLE: "ledger-checkpoints",
  },
  { timeoutSeconds: 60, memoryMb: 512 },
);

await createFunctionIfMissing(spec);

try {
  const replay = await invokeForResult(functionName, {
    task: "replay-checkpoint",
    checkpointId: "cp-2026-06-01T00:00:00Z",
    tenantId: "acme-finance",
  });

  console.log({
    disasterRecoveryPattern:
      "Lambda is redeployed from spec and replays durable checkpoints from external state stores",
    replay,
    runbook: [
      "redeploy function from IaC/artifact",
      "restore state from DynamoDB/S3 backups",
      "replay checkpoint events idempotently",
      "emit audit marker and close incident",
    ],
    audit: createLambdaAuditEvent({
      functionName,
      action: "DrReplayCheckpoint",
      outcome: "SUCCESS",
      tenantId: "acme-finance",
      traceId: "trace-dr-restore-001",
    }),
  });
} finally {
  await deleteFunction(functionName);
}
