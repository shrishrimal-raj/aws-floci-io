import { fileURLToPath } from "node:url";
import { zeroTrustUserPoolPlan } from "../../../../src/cognito.js";
import { crossAccountComplianceExample } from "../../../../src/examples/cross-account-compliance-example.js";
import { secureAuthorizerExample } from "../../../../src/examples/secure-authorizer-example.js";
import { tenantSecretRotationExample } from "../../../../src/examples/tenant-secret-rotation-example.js";
import { tenantTaskPolicy, findOverbroadStatements } from "../../../../src/iam-policy.js";

/**
 * End-to-end enterprise scenario:
 * 1. plan Cognito MFA tenant identity
 * 2. authorize JWT claims and tenant boundary
 * 3. generate least-privilege IAM and cross-account trust
 * 4. protect secrets with KMS context and lifecycle decisions
 * 5. emit redacted audit/compliance payloads
 */
export function enterpriseZeroTrustPlatformScenario() {
  const auth = secureAuthorizerExample();
  const secrets = tenantSecretRotationExample();
  const crossAccount = crossAccountComplianceExample();
  const policy = tenantTaskPolicy("tenant-a", "arn:aws:dynamodb:us-east-1:123:table/taskflow", "arn:aws:s3:::taskflow");

  return {
    userPoolPlan: zeroTrustUserPoolPlan("prod-zero-trust-saas"),
    auth,
    policyReview: { overbroadStatements: findOverbroadStatements(policy).length },
    secrets,
    crossAccount,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(enterpriseZeroTrustPlatformScenario(), null, 2));
}
