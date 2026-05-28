import {
  AttachRolePolicyCommand,
  CreatePolicyCommand,
  CreateRoleCommand,
  DeletePolicyCommand,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  GetRoleCommand,
  IAMClient,
} from "@aws-sdk/client-iam";
import { client as defaultClient } from "../client.js";
import { IAMError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new IAMError(e instanceof Error && e.name ? e.name : "UNKNOWN", `IAM ${op} failed`, e);
};

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export const lambdaTrustPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }],
});

export function policyDocument(actions: string[], resources: string[] = ["*"]) {
  return JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: actions, Resource: resources }] });
}

export async function createRole(
  name: string,
  assumeRolePolicyDocument = lambdaTrustPolicy,
  iam: IAMClient = defaultClient
): Promise<string> {
  try {
    const result = await iam.send(new CreateRoleCommand({ RoleName: name, AssumeRolePolicyDocument: assumeRolePolicyDocument }));
    return requireValue(result.Role?.Arn, "Role Arn");
  } catch (e) {
    if (e instanceof Error && e.name === "EntityAlreadyExists") return requireValue((await getRole(name, iam)).Arn, "Role Arn");
    return err("createRole", e);
  }
}

export async function getRole(name: string, iam: IAMClient = defaultClient) {
  try {
    const role = (await iam.send(new GetRoleCommand({ RoleName: name }))).Role;
    if (!role) throw new Error("Role missing");
    return role;
  } catch (e) {
    return err("getRole", e);
  }
}

export async function createPolicy(name: string, document: string, iam: IAMClient = defaultClient): Promise<string> {
  try {
    const result = await iam.send(new CreatePolicyCommand({ PolicyName: name, PolicyDocument: document }));
    return requireValue(result.Policy?.Arn, "Policy Arn");
  } catch (e) {
    return err("createPolicy", e);
  }
}

export async function attachPolicy(roleName: string, policyArn: string, iam: IAMClient = defaultClient): Promise<void> {
  try {
    await iam.send(new AttachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn }));
  } catch (e) {
    return err("attachPolicy", e);
  }
}

export async function detachPolicy(roleName: string, policyArn: string, iam: IAMClient = defaultClient): Promise<void> {
  try {
    await iam.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policyArn }));
  } catch (e) {
    if (e instanceof Error && e.name === "NoSuchEntity") return;
    return err("detachPolicy", e);
  }
}

export async function deletePolicy(policyArn: string | undefined, iam: IAMClient = defaultClient): Promise<void> {
  if (!policyArn) return;
  try {
    await iam.send(new DeletePolicyCommand({ PolicyArn: policyArn }));
  } catch (e) {
    if (e instanceof Error && e.name === "NoSuchEntity") return;
    return err("deletePolicy", e);
  }
}

export async function deleteRole(roleName: string | undefined, iam: IAMClient = defaultClient): Promise<void> {
  if (!roleName) return;
  try {
    await iam.send(new DeleteRoleCommand({ RoleName: roleName }));
  } catch (e) {
    if (e instanceof Error && e.name === "NoSuchEntity") return;
    return err("deleteRole", e);
  }
}
