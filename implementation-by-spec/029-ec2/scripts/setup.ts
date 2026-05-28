#!/usr/bin/env tsx
import { createSecurityGroup } from "../src/use-cases/instances.js";
export const sgName = process.env.EC2_SG_NAME ?? "floci-ec2-lab";
const groupId = await createSecurityGroup(sgName);
console.log(`Setup EC2 security group ${groupId}`);
