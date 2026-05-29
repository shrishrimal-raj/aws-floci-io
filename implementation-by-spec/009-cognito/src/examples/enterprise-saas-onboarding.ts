#!/usr/bin/env tsx
import {
  buildCognitoIssuerUrl,
  createManagedUsers,
  createUserPoolBundle,
  deleteUserPool,
  retryCognitoControlPlane,
} from "../use-cases/user-pools.js";

const tenantId = "tenant-acme";
const bundle = await retryCognitoControlPlane(() => createUserPoolBundle(`floci-saas-${tenantId}-${Date.now()}`, "acme-web"), {
  attempts: 3,
  delayMs: 200,
});

try {
  const users = await createManagedUsers(bundle.userPoolId, [
    { email: "owner@acme.example", attributes: { "custom:tenantId": tenantId, "custom:role": "owner" } },
    { email: "analyst@acme.example", attributes: { "custom:tenantId": tenantId, "custom:role": "analyst" } },
    { email: "auditor@acme.example", attributes: { "custom:tenantId": tenantId, "custom:role": "auditor" } },
  ]);

  console.log({
    scenario: "enterprise SaaS tenant onboarding",
    tenantId,
    userPoolId: bundle.userPoolId,
    clientId: bundle.clientId,
    issuer: buildCognitoIssuerUrl(bundle.userPoolId),
    users,
    secureAccessPattern: [
      "Verify JWT signature with Cognito JWKS in API Gateway authorizer or application middleware.",
      "Validate iss, token_use, client_id/aud, exp, tenantId, and role before serving data.",
      "Use least-privilege groups/claims and keep admin APIs separate from end-user apps.",
    ],
    auditLogging: [
      "Emit auth decision events with requestId, subject, tenantId, clientId, and reason.",
      "Never log raw tokens, passwords, refresh tokens, or MFA secrets.",
    ],
    costOptimization: [
      "Reuse a shared pool for many small tenants unless isolation/compliance requires dedicated pools.",
      "Set token lifetimes to balance security, refresh frequency, and downstream load.",
    ],
  });
} finally {
  await deleteUserPool(bundle.userPoolId);
}
