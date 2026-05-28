import { deleteKeyPair, deleteSecurityGroup, terminateLabInstances } from "../src/index.js";

const terminated = await terminateLabInstances();
await deleteKeyPair();
await deleteSecurityGroup();

console.log(`terminated instances: ${terminated.length ? terminated.join(", ") : "none"}`);
console.log("key pair/security group cleanup attempted");
