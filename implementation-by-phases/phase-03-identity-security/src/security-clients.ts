import { ACMClient } from "@aws-sdk/client-acm";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { IAMClient } from "@aws-sdk/client-iam";
import { KMSClient } from "@aws-sdk/client-kms";
import { STSClient } from "@aws-sdk/client-sts";
import { awsDefaults, type AwsClientOptions } from "@floci-lab/aws-clients";

export interface SecurityClients {
  cognito: CognitoIdentityProviderClient;
  iam: IAMClient;
  sts: STSClient;
  kms: KMSClient;
  acm: ACMClient;
}

/**
 * Creates AWS SDK clients for identity/security services using Floci-friendly defaults.
 *
 * Example: local labs use `http://localhost:4566`; production omits endpoint and relies on IAM role credentials.
 */
export function createSecurityClients(options: AwsClientOptions = {}): SecurityClients {
  const endpoint = options.endpoint ?? process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
  const defaults = awsDefaults({ endpoint, ...options });
  return {
    cognito: new CognitoIdentityProviderClient(defaults),
    iam: new IAMClient(defaults),
    sts: new STSClient(defaults),
    kms: new KMSClient(defaults),
    acm: new ACMClient(defaults),
  };
}
