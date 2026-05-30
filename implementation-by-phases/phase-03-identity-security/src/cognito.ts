import {
  AdminCreateUserCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  type CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

export interface UserPoolPlan {
  name: string;
  customAttributes: string[];
  mfaRequired: boolean;
  hostedUiFallback: boolean;
}

/**
 * Builds standard Cognito User Pool posture for multi-tenant SaaS.
 *
 * Example: platform bootstrap uses this plan to require MFA and add tenant/role/plan custom attributes to every user token.
 */
export function zeroTrustUserPoolPlan(name = "zero-trust-saas"): UserPoolPlan {
  return {
    name,
    customAttributes: ["tenant_id", "role", "plan"],
    mfaRequired: true,
    hostedUiFallback: true,
  };
}

export class CognitoProvisioner {
  constructor(private readonly cognito: CognitoIdentityProviderClient) {}

  /**
   * Creates Cognito User Pool from zero-trust plan.
   *
   * Example: SaaS control-plane creates one pool per environment with MFA and tenant custom attributes.
   */
  async createUserPool(plan: UserPoolPlan): Promise<string> {
    const result = await this.cognito.send(
      new CreateUserPoolCommand({
        PoolName: plan.name,
        MfaConfiguration: plan.mfaRequired ? "ON" : "OFF",
        Schema: plan.customAttributes.map((name) => ({ Name: name, AttributeDataType: "String", Mutable: true })),
      })
    );
    if (!result.UserPool?.Id) throw new Error("Cognito returned no user pool id");
    return result.UserPool.Id;
  }

  /**
   * Creates browser/mobile app client without client secret.
   *
   * Example: SPA uses SRP auth and refresh tokens; backend validates resulting Cognito JWTs with `verifyCognitoClaims`.
   */
  async createAppClient(userPoolId: string, name = "web"): Promise<string> {
    const result = await this.cognito.send(
      new CreateUserPoolClientCommand({
        UserPoolId: userPoolId,
        ClientName: name,
        GenerateSecret: false,
        ExplicitAuthFlows: ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
      })
    );
    if (!result.UserPoolClient?.ClientId) throw new Error("Cognito returned no app client id");
    return result.UserPoolClient.ClientId;
  }

  /**
   * Invites user with tenant identity bound into Cognito custom claim.
   *
   * Example: tenant admin invites `analyst@acme.com`; every token carries `custom:tenant_id=tenant-a` for API isolation.
   */
  async inviteUser(userPoolId: string, email: string, tenantId: string): Promise<void> {
    await this.cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "custom:tenant_id", Value: tenantId },
        ],
      })
    );
  }
}
