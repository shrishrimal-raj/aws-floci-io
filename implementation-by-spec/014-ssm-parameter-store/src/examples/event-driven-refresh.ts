#!/usr/bin/env tsx
import { buildParameterAuditLog, parameterPath, putJsonParameter, getJsonParameter, deleteParameter, withParameterStoreRetry } from "../index.js";

const flagPath = parameterPath("notification-worker", "dev", `feature-refresh-${Date.now()}`);

await withParameterStoreRetry(() => putJsonParameter(flagPath, { emailV2: true, smsV2: false }), {
  maxAttempts: 3,
  baseDelayMs: 50,
  backoffRate: 2,
});

try {
  const flags = await getJsonParameter<Record<string, boolean>>(flagPath);
  const simulatedEventBridgeEvent = {
    source: "aws.ssm",
    "detail-type": "Parameter Store Change",
    detail: { name: flagPath, operation: "Update" },
  };

  console.log(
    JSON.stringify(
      {
        flags,
        eventDrivenRefresh: simulatedEventBridgeEvent,
        action: "worker reloads in-memory config cache after receiving parameter-change event",
        audit: buildParameterAuditLog({
          eventId: "evt-parameter-refresh",
          actor: "notification-worker",
          action: "RefreshConfigCache",
          parameterName: flagPath,
          outcome: "ALLOW",
        }),
      },
      null,
      2
    )
  );
} finally {
  await deleteParameter(flagPath);
}
