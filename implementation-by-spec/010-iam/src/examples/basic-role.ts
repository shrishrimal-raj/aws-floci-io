#!/usr/bin/env tsx
import { attachPolicy, createPolicy, createRole, deletePolicy, deleteRole, detachPolicy, policyDocument } from "../use-cases/access.js";
const role = `floci-iam-example-${Date.now()}`;
const policyArn = await createPolicy(`${role}-policy`, policyDocument(["s3:GetObject"]));
console.log(await createRole(role));
await attachPolicy(role, policyArn);
await detachPolicy(role, policyArn);
await deletePolicy(policyArn);
await deleteRole(role);
