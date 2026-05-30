export interface PolicyStatement {
  Sid?: string;
  Effect: "Allow" | "Deny";
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, string | string[]>>;
  Principal?: Record<string, string | string[]>;
}

export interface PolicyDocument {
  Version: "2012-10-17";
  Statement: PolicyStatement[];
}

export type PolicyDecision = "explicitDeny" | "allow" | "implicitDeny";

/**
 * Builds least-privilege tenant policy for DynamoDB task rows and S3 attachments.
 *
 * Example: Lambda role for tenant-a can query `TENANT#tenant-a` rows and access only `s3://bucket/tenants/tenant-a/*`.
 */
export function tenantTaskPolicy(tenantId: string, tableArn: string, bucketArn: string): PolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "TenantTaskRows",
        Effect: "Allow",
        Action: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:UpdateItem"],
        Resource: tableArn,
        Condition: { "ForAllValues:StringLike": { "dynamodb:LeadingKeys": [`TENANT#${tenantId}`] } },
      },
      {
        Sid: "TenantAttachments",
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject"],
        Resource: `${bucketArn}/tenants/${tenantId}/*`,
      },
    ],
  };
}

/**
 * Builds STS trust policy with optional ExternalId confused-deputy protection.
 *
 * Example: analytics vendor role can assume tenant export role only when it supplies tenant-specific ExternalId.
 */
export function trustPolicyForPrincipal(principalArn: string, externalId?: string): PolicyDocument {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: principalArn },
        Action: "sts:AssumeRole",
        Resource: "*",
        ...(externalId && { Condition: { StringEquals: { "sts:ExternalId": externalId } } }),
      },
    ],
  };
}

/**
 * Evaluates simplified IAM policy action/resource matches, with explicit deny priority.
 *
 * Example: CI security test confirms `s3:DeleteObject` stays implicitly denied for tenant attachment role.
 */
export function evaluatePolicy(document: PolicyDocument, action: string, resource: string): PolicyDecision {
  let allowed = false;
  for (const statement of document.Statement) {
    if (!matches(statement.Action, action) || !matches(statement.Resource, resource)) continue;
    if (statement.Effect === "Deny") return "explicitDeny";
    allowed = true;
  }
  return allowed ? "allow" : "implicitDeny";
}

/**
 * Finds wildcard actions/resources that need security review.
 *
 * Example: pull-request check fails if generated policy contains `iam:*` or `Resource: "*"` outside approved trust policies.
 */
export function findOverbroadStatements(document: PolicyDocument): PolicyStatement[] {
  return document.Statement.filter((statement) =>
    [statement.Action, statement.Resource].flat().some((value) => value === "*" || value.endsWith(":*"))
  );
}

/**
 * Adds explicit deny guardrail for dangerous actions.
 *
 * Example: attach deny for `kms:ScheduleKeyDeletion` and `iam:CreateAccessKey` to production break-glass roles.
 */
export function denyActions(actions: string[], resources: string | string[] = "*"): PolicyStatement {
  return { Sid: "ExplicitDenyGuardrail", Effect: "Deny", Action: actions, Resource: resources };
}

function matches(patterns: string | string[], value: string): boolean {
  return [patterns].flat().some((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(value);
  });
}
