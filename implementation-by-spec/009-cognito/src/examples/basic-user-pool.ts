#!/usr/bin/env tsx
import {
  adminCreateUser,
  createUserPool,
  createUserPoolClient,
  deleteUserPool,
  listUsers,
} from "../use-cases/user-pools.js";

let userPoolId: string | undefined;

try {
  userPoolId = await createUserPool(`floci-cognito-example-${Date.now()}`);
  const clientId = await createUserPoolClient(userPoolId, "web");
  await adminCreateUser(userPoolId, "ada@example.com", { "custom:department": "engineering" });

  console.log({
    scenario: "basic user-pool onboarding",
    userPoolId,
    clientId,
    users: (await listUsers(userPoolId)).map((user) => user.Username),
  });
} finally {
  await deleteUserPool(userPoolId);
}
