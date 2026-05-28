#!/usr/bin/env tsx
import { attachPolicy, createPolicy, createRole, policyDocument } from "../src/use-cases/access.js";
export const roleName = process.env.IAM_ROLE_NAME ?? "floci-iam-lab-role";
const roleArn = await createRole(roleName);
const policyArn = await createPolicy("floci-iam-lab-policy", policyDocument(["s3:GetObject"],["arn:aws:s3:::example/*"]));
await attachPolicy(roleName, policyArn);
console.log(`Setup IAM role ${roleArn}`);
console.log(`Setup IAM policy ${policyArn}`);
