import {
  createKeyPair,
  defaultKeyName,
  ensureRdpSecurityGroup,
  launchWindowsInstance,
  waitForInstanceState,
} from "../index.js";

await createKeyPair(defaultKeyName);
const securityGroup = await ensureRdpSecurityGroup();
const instanceId = await launchWindowsInstance({
  name: "my-new-windows",
  keyName: defaultKeyName,
  securityGroupIds: [securityGroup.groupId],
});
const instance = await waitForInstanceState(instanceId, "running");

console.log({
  instanceId: instance.InstanceId,
  imageId: instance.ImageId,
  state: instance.State?.Name,
  securityGroupId: securityGroup.groupId,
});
