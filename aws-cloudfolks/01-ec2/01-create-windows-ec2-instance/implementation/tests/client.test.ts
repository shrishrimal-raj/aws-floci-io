import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import {
  createKeyPair,
  defaultWindowsAmiId,
  deleteKeyPair,
  deleteSecurityGroup,
  ensureRdpSecurityGroup,
  launchWindowsInstance,
  terminateInstance,
  waitForInstanceState,
} from "../src/use-cases/windows-instance.js";

const suffix = Date.now();
const keyName = `floci-windows-test-key-${suffix}`;
const groupName = `floci-windows-test-sg-${suffix}`;
let instanceId: string | undefined;
let flociAvailable = false;

describe("AWS CloudFolks Windows EC2 lab", () => {
  beforeAll(async () => {
    try {
      await waitForFloci(process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566", 5000);
      flociAvailable = true;
    } catch {
      flociAvailable = false;
    }
  }, 35000);

  afterAll(async () => {
    if (!flociAvailable) return;
    if (instanceId) await terminateInstance(instanceId);
    await deleteKeyPair(keyName);
    await deleteSecurityGroup(groupName);
  }, 35000);

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("creates key pair and RDP security group", async () => {
    if (!flociAvailable) return;
    await expect(createKeyPair(keyName)).resolves.toBeDefined();
    const group = await ensureRdpSecurityGroup(groupName);

    expect(group.groupName).toBe(groupName);
    expect(group.groupId).toMatch(/^sg-/);
  });

  it("launches and describes a Windows-labeled EC2 instance", async () => {
    if (!flociAvailable) return;
    await createKeyPair(keyName);
    const group = await ensureRdpSecurityGroup(groupName);

    instanceId = await launchWindowsInstance({
      name: `floci-windows-test-${suffix}`,
      keyName,
      securityGroupIds: [group.groupId],
    });

    const instance = await waitForInstanceState(instanceId, "running", client, 30000);
    expect(instance.InstanceId).toBe(instanceId);
    expect(instance.ImageId).toBe(defaultWindowsAmiId);
    expect(instance.State?.Name).toBe("running");
    expect(instance.Tags?.some((tag) => tag.Key === "Lab" && tag.Value === "aws-cloudfolks-windows-ec2")).toBe(true);
  }, 35000);
});
