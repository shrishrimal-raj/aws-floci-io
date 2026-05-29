#!/usr/bin/env tsx
import {
  auditEntity,
  createSingleTable,
  deleteTable,
  putJsonEntity,
  queryByPk,
} from "../use-cases/table.js";

const table = `floci-ddb-audit-${Date.now()}`;
await createSingleTable(table);

const audit = auditEntity({
  tenantId: "regulated-bank",
  actorId: "user-123",
  action: "LoanApplicationApproved",
  resourceId: "loan-9001",
  outcome: "ALLOW",
  traceId: "trace-loan-9001",
});

await putJsonEntity(audit, table);

console.log({
  compliancePattern:
    "append-only audit rows support CloudWatch/S3 export and regulator evidence trails",
  auditPartition: audit.pk,
  auditItems: await queryByPk(audit.pk, table),
});

await deleteTable(table);
