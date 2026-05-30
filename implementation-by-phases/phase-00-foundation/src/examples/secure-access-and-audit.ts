import { buildArn, buildEnterpriseTags, createAuditEvent, parseArn } from "../index.js";

/**
 * Real-world scenario: platform team creates an orders bucket and writes a safe audit event.
 * Pattern covered: secure access naming, account masking, standard tags, compliance metadata.
 */
export function secureAccessAndAuditExample() {
  const bucketArn = buildArn({
    partition: "aws",
    service: "s3",
    region: "us-east-1",
    accountId: "123456789012",
    resource: "bucket/acme-prod-orders-archive",
  });

  const resource = parseArn(bucketArn);
  const tags = buildEnterpriseTags(
    {
      application: "orders-platform",
      environment: "prod",
      owner: "platform-security",
      costCenter: "cc-1001",
      dataClassification: "confidential",
    },
    { Backup: "required", PublicAccess: "blocked" }
  );

  const audit = createAuditEvent({
    actor: "ci-role/orders-platform-deployer",
    action: "s3.bucket.create",
    resourceArn: bucketArn,
    result: "success",
    metadata: {
      changeRequest: "CHG-2026-0001",
      encryption: "aws:kms",
      publicAccessBlocked: true,
    },
    now: new Date("2026-01-01T00:00:00.000Z"),
  });

  return { resource, tags, audit };
}
