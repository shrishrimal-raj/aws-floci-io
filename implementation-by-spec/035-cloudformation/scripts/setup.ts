#!/usr/bin/env tsx
import { createStack, s3BucketTemplate } from "../src/use-cases/stacks.js";
export const stackName = process.env.CFN_STACK ?? "floci-cfn-lab";
await createStack(stackName,s3BucketTemplate("floci-cfn-lab"));
console.log(`Setup CloudFormation stack ${stackName}`);
