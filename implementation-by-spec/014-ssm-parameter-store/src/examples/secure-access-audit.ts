#!/usr/bin/env tsx
import {
  buildParameterAuditLog,
  parameterLifecyclePolicy,
  parameterPath,
  parameterPathReadPolicy,
  putStringParameter,
  getStringParameter,
  deleteParameter,
} from "../index.js";

const secretName = parameterPath("payments", "dev", `provider-token-${Date.now()}`);

await putStringParameter(secretName, "tok_test_redacted", true);
try {
  const token = await getStringParameter(secretName);
  console.log(
    JSON.stringify(
      {
        tokenLoaded: Boolean(token),
        policy: parameterPathReadPolicy("/payments/dev", "us-east-1", "123456789012", "payments"),
        audit: buildParameterAuditLog({
          eventId: "evt-payment-token-read",
          actor: "payments-lambda-role",
          action: "GetParameter",
          parameterName: secretName,
          outcome: "ALLOW",
          metadata: { secureString: true, kmsKeyAlias: "alias/payments-config" },
        }),
        lifecycle: parameterLifecyclePolicy({
          path: secretName,
          owner: "payments-platform",
          classification: "restricted",
          rotationDays: 30,
          maxAgeDays: 365,
          backupRequired: true,
        }),
      },
      null,
      2
    )
  );
} finally {
  await deleteParameter(secretName);
}
