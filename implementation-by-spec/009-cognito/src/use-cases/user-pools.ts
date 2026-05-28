import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  DeleteUserPoolCommand,
  ListUsersCommand,
  type CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { client as defaultClient } from "../client.js";
import { CognitoError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new CognitoError(e instanceof Error && e.name ? e.name : "UNKNOWN", `Cognito ${op} failed`, e);
};

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export async function createUserPool(
  name: string,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<string> {
  try {
    const result = await cognito.send(
      new CreateUserPoolCommand({
        PoolName: name,
        AutoVerifiedAttributes: ["email"],
        UsernameAttributes: ["email"],
        Policies: { PasswordPolicy: { MinimumLength: 8, RequireLowercase: true, RequireNumbers: true } },
      })
    );
    return requireValue(result.UserPool?.Id, "UserPool Id");
  } catch (e) {
    return err("createUserPool", e);
  }
}

export async function createUserPoolClient(
  userPoolId: string,
  name = "web",
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<string> {
  try {
    const result = await cognito.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: name,
        GenerateSecret: false,
        ExplicitAuthFlows: ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
      })
    );
    return requireValue(result.UserPoolClient?.ClientId, "UserPoolClient ClientId");
  } catch (e) {
    return err("createUserPoolClient", e);
  }
}

export async function adminCreateUser(
  userPoolId: string,
  email: string,
  cognito: CognitoIdentityProviderClient = defaultClient
) {
  try {
    return await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
        MessageAction: "SUPPRESS",
      })
    );
  } catch (e) {
    return err("adminCreateUser", e);
  }
}

export async function adminGetUser(
  userPoolId: string,
  username: string,
  cognito: CognitoIdentityProviderClient = defaultClient
) {
  try {
    return await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
  } catch (e) {
    return err("adminGetUser", e);
  }
}

export async function listUsers(userPoolId: string, cognito: CognitoIdentityProviderClient = defaultClient) {
  try {
    return (await cognito.send(new ListUsersCommand({ UserPoolId: userPoolId }))).Users ?? [];
  } catch (e) {
    return err("listUsers", e);
  }
}

export async function adminDeleteUser(
  userPoolId: string,
  username: string,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<void> {
  try {
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));
  } catch (e) {
    if (e instanceof Error && e.name === "UserNotFoundException") return;
    return err("adminDeleteUser", e);
  }
}

export async function deleteUserPool(
  userPoolId: string | undefined,
  cognito: CognitoIdentityProviderClient = defaultClient
): Promise<void> {
  if (!userPoolId) return;
  try {
    await cognito.send(new DeleteUserPoolCommand({ UserPoolId: userPoolId }));
  } catch (e) {
    if (e instanceof Error && e.name === "ResourceNotFoundException") return;
    return err("deleteUserPool", e);
  }
}

export function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) throw new CognitoError("INVALID_JWT", "JWT payload missing");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}
