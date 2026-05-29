#!/usr/bin/env tsx
import {
  createFunction,
  deleteFunction,
  invokeForResult,
  serviceFunctionSpec,
} from "../use-cases/functions.js";

const name = `floci-lambda-compliance-${Date.now()}`;

await createFunction(
  serviceFunctionSpec(
    name,
    { CONFIG_RULE: "required-tags", AUDIT_BUCKET: "compliance-audit" },
    { timeoutSeconds: 120, memoryMb: 256 },
  ),
);

try {
  const result = await invokeForResult(name, {
    task: "scan-untagged-resources",
    tenantId: "regulated-co",
  });
  console.log({
    complianceUseCase:
      "scheduled Lambda checks tags/config, writes audit evidence to S3, and emits CloudWatch metric",
    result,
    productionControls: [
      "least privilege IAM",
      "KMS-encrypted audit bucket",
      "EventBridge Scheduler",
      "alarm on failed checks",
    ],
  });
} finally {
  await deleteFunction(name);
}
