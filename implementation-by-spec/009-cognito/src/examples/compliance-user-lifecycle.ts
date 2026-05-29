#!/usr/bin/env tsx
import {
  adminDeleteUser,
  adminGetUser,
  authAuditEvent,
  createManagedUsers,
  withUserPoolLifecycle,
} from "../use-cases/user-pools.js";

await withUserPoolLifecycle(`floci-compliance-users-${Date.now()}`, async ({ userPoolId, clientId }) => {
  const users = await createManagedUsers(userPoolId, [
    { email: "privacy-request@example.com", attributes: { "custom:region": "eu", "custom:dataClass": "personal" } },
  ]);
  const user = users[0];
  if (!user) throw new Error("fixture user missing");
  const profile = await adminGetUser(userPoolId, user.email);

  await adminDeleteUser(userPoolId, user.email);

  console.log({
    scenario: "compliance-oriented user lifecycle",
    userPoolId,
    clientId,
    createdUser: user,
    profileReadForEvidence: {
      username: profile.Username,
      userStatus: profile.UserStatus,
    },
    deletion: "user deleted from pool; coordinate erasure in downstream systems separately",
    audit: authAuditEvent("auth.claims.accepted", { sub: profile.Username, email: user.email, client_id: clientId }, "gdpr-req-001"),
    dataLifecycleManagement: [
      "Keep identity data minimal; store app profile data in dedicated encrypted data stores.",
      "Use deletion workflows that call Cognito plus downstream systems such as DynamoDB, S3, and analytics stores.",
      "Retain audit evidence according to legal basis and retention policy.",
    ],
    backupAndDisasterRecovery: [
      "Version infrastructure definitions for user pools and app clients.",
      "Document recovery steps for app client IDs, callback URLs, domains, groups, and triggers.",
      "Test account recovery, MFA reset, and admin break-glass runbooks.",
    ],
  });
});
