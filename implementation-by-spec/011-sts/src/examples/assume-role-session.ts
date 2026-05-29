#!/usr/bin/env tsx
import { assumeRoleSession } from "../use-cases/credentials.js";

const roleArn = process.env.STS_ROLE_ARN ?? "arn:aws:iam::000000000000:role/floci-sts-lab";
console.log(await assumeRoleSession(roleArn, "example-session", 900));
