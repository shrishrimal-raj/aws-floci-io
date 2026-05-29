import {
  AttachRolePolicyCommand,
  CreatePolicyCommand,
  CreateRoleCommand,
  DeletePolicyCommand,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  GetRoleCommand,
  type IAMClient,
} from "@aws-sdk/client-iam";
import { client as defaultClient } from "../client.js";
import { IAMError } from "../errors.js";

export interface RolePolicyBundle {
  roleName: string;
  roleArn: string;
  policyArn: string;
}

export interface PolicyStatementInput {
  actions: string[];
  resources?: string[];
  effect?: "Allow" | "Deny";
  conditions?: Record<string, Record<string, string | string[]>>;
}

export interface IamAuditEvent {
  eventId: string;
  timestamp: string;
  action: string;
  principal: string;
  resource: string;
  outcome: "ALLOW" | "DENY" | "REVIEW";
  reason?: string;
  ticketId?: string;
}

export interface PolicyValidationFinding {
  severity: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  statementIndex: number;
}

export interface LeastPrivilegePolicyInput {
  service: string;
  actions: string[];
  resourceArn: string;
  tenantId?: string;
}

function awsErrorName(error: unknown): string {
  if (error instanceof IAMError && error.cause instanceof Error)
    return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new IAMError(code, `IAM ${operation} failed`, error);
}

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export const lambdaTrustPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { Service: "lambda.amazonaws.com" },
      Action: "sts:AssumeRole",
    },
  ],
});

/**
 * Build trust policy for any AWS service principal.
 *
 * @example
 * const trust = serviceTrustPolicy("ecs-tasks.amazonaws.com");
 */
export function serviceTrustPolicy(servicePrincipal: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: servicePrincipal },
        Action: "sts:AssumeRole",
      },
    ],
  });
}

/**
 * Build common resource ARN safely from parts for examples and tests.
 *
 * @example
 * const arn = resourceArn("s3", "", "my-bucket/*");
 */
export function resourceArn(
  service: string,
  region: string,
  resource: string,
  accountId = "000000000000",
): string {
  return `arn:aws:${service}:${region}:${accountId}:${resource}`;
}

/**
 * Build IAM policy document from actions and resources.
 *
 * @example
 * const doc = policyDocument(["s3:GetObject"], ["arn:aws:s3:::bucket/*"]);
 */
export function policyDocument(
  actions: string[],
  resources: string[] = ["*"],
): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Action: actions, Resource: resources }],
  });
}

/**
 * Build tenant-aware least-privilege allow policy with optional tenant tag condition.
 *
 * @example
 * const doc = leastPrivilegePolicy({ service: "s3", actions: ["s3:GetObject"], resourceArn: "arn:aws:s3:::bucket/tenant-a/*", tenantId: "tenant-a" });
 */
export function leastPrivilegePolicy(input: LeastPrivilegePolicyInput): string {
  return multiStatementPolicy([
    {
      actions: input.actions.map((action) =>
        action.includes(":") ? action : `${input.service}:${action}`,
      ),
      resources: [input.resourceArn],
      conditions: input.tenantId
        ? { StringEquals: { "aws:PrincipalTag/tenantId": input.tenantId } }
        : undefined,
    },
  ]);
}

/**
 * Build IAM policy document with multiple statements.
 *
 * @example
 * const doc = multiStatementPolicy([{ actions: ["s3:GetObject"], resources: ["arn"] }]);
 */
export function multiStatementPolicy(
  statements: PolicyStatementInput[],
): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: statements.map((statement) => ({
      Effect: statement.effect ?? "Allow",
      Action: statement.actions,
      Resource: statement.resources ?? ["*"],
      ...(statement.conditions && { Condition: statement.conditions }),
    })),
  });
}

/**
 * Validate obvious wildcard risks before creating demo or production policies.
 *
 * @example
 * const findings = validatePolicyDocument(policyDocument(["*"], ["*"]));
 */
export function validatePolicyDocument(
  document: string,
): PolicyValidationFinding[] {
  const parsed = JSON.parse(document) as {
    Statement?: Array<{
      Action?: string | string[];
      Resource?: string | string[];
      Effect?: string;
    }>;
  };
  const statements = parsed.Statement ?? [];
  return statements.flatMap((statement, index) => {
    const actions = Array.isArray(statement.Action)
      ? statement.Action
      : [statement.Action ?? ""];
    const resources = Array.isArray(statement.Resource)
      ? statement.Resource
      : [statement.Resource ?? ""];
    const findings: PolicyValidationFinding[] = [];
    if (
      statement.Effect === "Allow" &&
      actions.some((action) => action === "*" || action.endsWith(":*"))
    ) {
      findings.push({
        severity: "HIGH",
        message: "Allow statement grants wildcard actions",
        statementIndex: index,
      });
    }
    if (statement.Effect === "Allow" && resources.includes("*")) {
      findings.push({
        severity: "MEDIUM",
        message: "Allow statement grants access to all resources",
        statementIndex: index,
      });
    }
    return findings;
  });
}

/**
 * Build structured audit event for IAM changes and access reviews.
 *
 * @example
 * createIamAuditEvent({ action: "CreateRole", principal: "platform", resource: "orders-role", outcome: "ALLOW" });
 */
export function createIamAuditEvent(
  input: Omit<IamAuditEvent, "eventId" | "timestamp">,
): IamAuditEvent {
  return {
    eventId: `iam-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    ...input,
  };
}

/**
 * Create IAM role with trust policy; existing roles return existing ARN.
 *
 * @example
 * const roleArn = await createRole("lambda-role", lambdaTrustPolicy);
 */
export async function createRole(
  name: string,
  assumeRolePolicyDocument = lambdaTrustPolicy,
  iam: IAMClient = defaultClient,
): Promise<string> {
  try {
    const result = await iam.send(
      new CreateRoleCommand({
        RoleName: name,
        AssumeRolePolicyDocument: assumeRolePolicyDocument,
      }),
    );
    return requireValue(result.Role?.Arn, "Role Arn");
  } catch (error) {
    if (awsErrorName(error) === "EntityAlreadyExists")
      return requireValue((await getRole(name, iam)).Arn, "Role Arn");
    wrapError("createRole", error);
  }
}

/**
 * Fetch IAM role metadata by name.
 *
 * @example
 * const role = await getRole("lambda-role");
 */
export async function getRole(name: string, iam: IAMClient = defaultClient) {
  try {
    const role = (await iam.send(new GetRoleCommand({ RoleName: name }))).Role;
    if (!role) throw new Error("Role missing");
    return role;
  } catch (error) {
    wrapError("getRole", error);
  }
}

/**
 * Create managed policy from JSON document.
 *
 * @example
 * const policyArn = await createPolicy("read-s3", policyDocument(["s3:GetObject"], ["arn"]));
 */
export async function createPolicy(
  name: string,
  document: string,
  iam: IAMClient = defaultClient,
): Promise<string> {
  try {
    const result = await iam.send(
      new CreatePolicyCommand({ PolicyName: name, PolicyDocument: document }),
    );
    return requireValue(result.Policy?.Arn, "Policy Arn");
  } catch (error) {
    wrapError("createPolicy", error);
  }
}

/**
 * Attach managed policy to role.
 *
 * @example
 * await attachPolicy("lambda-role", policyArn);
 */
export async function attachPolicy(
  roleName: string,
  policyArn: string,
  iam: IAMClient = defaultClient,
): Promise<void> {
  try {
    await iam.send(
      new AttachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn }),
    );
  } catch (error) {
    wrapError("attachPolicy", error);
  }
}

/**
 * Create role, create policy, and attach policy together.
 *
 * @example
 * const bundle = await createRoleWithPolicy("lambda-role", "read-s3", policyDocument(["s3:GetObject"]));
 */
export async function createRoleWithPolicy(
  roleName: string,
  policyName: string,
  document: string,
  assumeRolePolicyDocument = lambdaTrustPolicy,
  iam: IAMClient = defaultClient,
): Promise<RolePolicyBundle> {
  const roleArn = await createRole(roleName, assumeRolePolicyDocument, iam);
  const policyArn = await createPolicy(policyName, document, iam);
  await attachPolicy(roleName, policyArn, iam);
  return { roleName, roleArn, policyArn };
}

/**
 * Detach managed policy from role; missing attachment/entity is ignored.
 *
 * @example
 * await detachPolicy("lambda-role", policyArn);
 */
export async function detachPolicy(
  roleName: string,
  policyArn: string,
  iam: IAMClient = defaultClient,
): Promise<void> {
  try {
    await iam.send(
      new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn }),
    );
  } catch (error) {
    if (awsErrorName(error) === "NoSuchEntity") return;
    wrapError("detachPolicy", error);
  }
}

/**
 * Delete managed policy; undefined or missing policy is ignored.
 *
 * @example
 * await deletePolicy(policyArn);
 */
export async function deletePolicy(
  policyArn: string | undefined,
  iam: IAMClient = defaultClient,
): Promise<void> {
  if (!policyArn) return;
  try {
    await iam.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
  } catch (error) {
    if (awsErrorName(error) === "NoSuchEntity") return;
    wrapError("deletePolicy", error);
  }
}

/**
 * Delete role; undefined or missing role is ignored.
 *
 * @example
 * await deleteRole("lambda-role");
 */
export async function deleteRole(
  roleName: string | undefined,
  iam: IAMClient = defaultClient,
): Promise<void> {
  if (!roleName) return;
  try {
    await iam.send(new DeleteRoleCommand({ RoleName: roleName }));
  } catch (error) {
    if (awsErrorName(error) === "NoSuchEntity") return;
    wrapError("deleteRole", error);
  }
}

/**
 * Detach policy then delete policy and role in dependency-safe order.
 *
 * @example
 * await cleanupRoleWithPolicy("lambda-role", policyArn);
 */
export async function cleanupRoleWithPolicy(
  roleName: string | undefined,
  policyArn: string | undefined,
  iam: IAMClient = defaultClient,
): Promise<void> {
  if (roleName && policyArn) await detachPolicy(roleName, policyArn, iam);
  await deletePolicy(policyArn, iam);
  await deleteRole(roleName, iam);
}
