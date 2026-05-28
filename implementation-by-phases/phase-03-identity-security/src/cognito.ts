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
