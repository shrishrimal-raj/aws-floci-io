#!/usr/bin/env tsx
import {
  buildHttpInvokeUrl,
  createApiAuditEvent,
  createBasicHttpApi,
  deleteHttpApi,
  routeKey,
} from "../use-cases/http-api.js";

const api = await createBasicHttpApi(`floci-http-compliance-${Date.now()}`);

try {
  const exportRoute = routeKey("GET", "/compliance/audit-export");
  console.log({
    api,
    exportRoute,
    exportUrl: buildHttpInvokeUrl(api.apiId, "/compliance/audit-export"),
    complianceUseCase:
      "admin-only HTTP API starts audit export job to S3 through Lambda/Step Functions",
    audit: createApiAuditEvent({
      apiId: api.apiId,
      routeKey: exportRoute,
      action: "AuditExportRequested",
      outcome: "ALLOW",
      tenantId: "regulated-co",
      requestId: "req-export-1",
    }),
    productionControls: [
      "Cognito/JWT admin group",
      "access logs",
      "KMS-encrypted export bucket",
      "CloudTrail",
      "rate limits",
    ],
  });
} finally {
  await deleteHttpApi(api.apiId);
}
