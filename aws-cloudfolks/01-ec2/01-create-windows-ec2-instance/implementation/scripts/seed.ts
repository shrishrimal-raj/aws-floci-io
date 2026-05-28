import {
  createKeyPair,
  defaultInstanceName,
  defaultKeyName,
  ensureRdpSecurityGroup,
  launchWindowsInstance,
  waitForInstanceState,
} from "../src/index.js";

await createKeyPair(defaultKeyName);
const securityGroup = await ensureRdpSecurityGroup();
const instanceId = await launchWindowsInstance({
  name: defaultInstanceName,
  keyName: defaultKeyName,
  securityGroupIds: [securityGroup.groupId],
  userData: "#!/bin/sh\necho floci-windows-lab > /tmp/lab.txt",
});

const instance = await waitForInstanceState(instanceId, "running");
console.log(`instance running: ${instance.InstanceId} (${instance.ImageId})`);
