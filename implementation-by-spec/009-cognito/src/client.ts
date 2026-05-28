import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new CognitoIdentityProviderClient(
  awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" })
);
