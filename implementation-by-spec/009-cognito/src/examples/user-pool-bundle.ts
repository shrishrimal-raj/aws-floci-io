#!/usr/bin/env tsx
import { createManagedUsers, deleteUserPool, retryCognitoControlPlane, createUserPoolBundle } from "../use-cases/user-pools.js";

const bundle = await retryCognitoControlPlane(() => createUserPoolBundle(`floci-cognito-bundle-${Date.now()}`, "web"));
try {
  const users = await createManagedUsers(bundle.userPoolId, [
    { email: "admin@example.com", attributes: { "custom:role": "admin" } },
    { email: "support@example.com", attributes: { "custom:role": "support" } },
  ]);

  console.log({
    scenario: "pool and public app-client bundle",
    ...bundle,
    users,
  });
} finally {
  await deleteUserPool(bundle.userPoolId);
}
