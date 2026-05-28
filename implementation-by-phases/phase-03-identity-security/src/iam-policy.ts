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

export function evaluatePolicy(document: PolicyDocument, action: string, resource: string): PolicyDecision {
  let allowed = false;
  for (const statement of document.Statement) {
    if (!matches(statement.Action, action) || !matches(statement.Resource, resource)) continue;
    if (statement.Effect === "Deny") return "explicitDeny";
    allowed = true;
  }
  return allowed ? "allow" : "implicitDeny";
}

export function findOverbroadStatements(document: PolicyDocument): PolicyStatement[] {
  return document.Statement.filter((statement) =>
    [statement.Action, statement.Resource].flat().some((value) => value === "*" || value.endsWith(":*"))
  );
}

function matches(patterns: string | string[], value: string): boolean {
  return [patterns].flat().some((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(value);
  });
}
