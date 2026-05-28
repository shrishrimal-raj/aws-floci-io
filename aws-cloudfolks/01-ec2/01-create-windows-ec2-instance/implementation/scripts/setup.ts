import { createKeyPair, ensureRdpSecurityGroup } from "../src/index.js";

const keyMaterial = await createKeyPair();
const securityGroup = await ensureRdpSecurityGroup();

console.log(`key pair ready: ${keyMaterial ? "created" : "already exists"}`);
console.log(`security group ready: ${securityGroup.groupName} (${securityGroup.groupId})`);
