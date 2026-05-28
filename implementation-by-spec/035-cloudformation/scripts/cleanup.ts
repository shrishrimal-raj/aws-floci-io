#!/usr/bin/env tsx
import { deleteStack } from "../src/use-cases/stacks.js";
const stackName = process.env.CFN_STACK ?? "floci-cfn-lab";
await deleteStack(stackName);
console.log(`Cleanup CloudFormation stack ${stackName}`);
