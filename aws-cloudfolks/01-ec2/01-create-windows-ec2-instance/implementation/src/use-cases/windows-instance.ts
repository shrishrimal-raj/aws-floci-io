import {
  AuthorizeSecurityGroupIngressCommand,
  CreateKeyPairCommand,
  CreateSecurityGroupCommand,
  CreateTagsCommand,
  DeleteKeyPairCommand,
  DeleteSecurityGroupCommand,
  DescribeInstancesCommand,
  DescribeSecurityGroupsCommand,
  RunInstancesCommand,
  TerminateInstancesCommand,
  type EC2Client,
  type Filter,
  type Instance,
  type _InstanceType,
} from "@aws-sdk/client-ec2";
import { client as defaultClient } from "../client.js";
import { Ec2WindowsLabError } from "../errors.js";

export const defaultWindowsAmiId = "ami-windows-server-2022";
export const defaultInstanceType: _InstanceType = "t3.micro";
export const defaultKeyName = "floci-windows-lab-key";
export const defaultSecurityGroupName = "floci-windows-rdp-sg";
export const defaultInstanceName = "floci-windows-lab";

export interface SecurityGroupResult {
  groupId: string;
  groupName: string;
}

export interface LaunchWindowsInstanceInput {
  name?: string;
  imageId?: string;
  instanceType?: _InstanceType;
  keyName?: string;
  securityGroupIds?: string[];
  userData?: string;
}

function awsErrorName(error: unknown): string {
  if (error instanceof Ec2WindowsLabError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  throw new Ec2WindowsLabError(awsErrorName(error) || "UNKNOWN", `EC2 Windows lab ${operation} failed`, error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createKeyPair(
  keyName = defaultKeyName,
  ec2: EC2Client = defaultClient
): Promise<string | undefined> {
  try {
    const result = await ec2.send(new CreateKeyPairCommand({ KeyName: keyName }));
    return result.KeyMaterial;
  } catch (error) {
    if (awsErrorName(error) === "InvalidKeyPair.Duplicate") return undefined;
    wrapError("createKeyPair", error);
  }
}

export async function deleteKeyPair(keyName = defaultKeyName, ec2: EC2Client = defaultClient): Promise<void> {
  try {
    await ec2.send(new DeleteKeyPairCommand({ KeyName: keyName }));
  } catch (error) {
    if (awsErrorName(error) === "InvalidKeyPair.NotFound") return;
    wrapError("deleteKeyPair", error);
  }
}

async function findSecurityGroupByName(groupName: string, ec2: EC2Client): Promise<SecurityGroupResult | undefined> {
  const result = await ec2.send(
    new DescribeSecurityGroupsCommand({ Filters: [{ Name: "group-name", Values: [groupName] }] })
  );
  const group = result.SecurityGroups?.[0];
  if (!group?.GroupId || !group.GroupName) return undefined;
  return { groupId: group.GroupId, groupName: group.GroupName };
}

export async function ensureRdpSecurityGroup(
  groupName = defaultSecurityGroupName,
  cidr = "0.0.0.0/0",
  ec2: EC2Client = defaultClient
): Promise<SecurityGroupResult> {
  try {
    const existing = await findSecurityGroupByName(groupName, ec2);
    if (existing) {
      await allowRdpIngress(existing.groupId, cidr, ec2);
      return existing;
    }

    const created = await ec2.send(
      new CreateSecurityGroupCommand({
        GroupName: groupName,
        Description: "Allow RDP for Floci Windows EC2 lab",
      })
    );

    if (!created.GroupId) throw new Error("CreateSecurityGroup returned no GroupId");
    await allowRdpIngress(created.GroupId, cidr, ec2);
    return { groupId: created.GroupId, groupName };
  } catch (error) {
    if (awsErrorName(error) === "InvalidGroup.Duplicate") {
      const existing = await findSecurityGroupByName(groupName, ec2);
      if (existing) return existing;
    }
    wrapError("ensureRdpSecurityGroup", error);
  }
}

export async function allowRdpIngress(
  groupId: string,
  cidr = "0.0.0.0/0",
  ec2: EC2Client = defaultClient
): Promise<void> {
  try {
    await ec2.send(
      new AuthorizeSecurityGroupIngressCommand({
        GroupId: groupId,
        IpPermissions: [
          {
            IpProtocol: "tcp",
            FromPort: 3389,
            ToPort: 3389,
            IpRanges: [{ CidrIp: cidr, Description: "RDP from lab workstation" }],
          },
        ],
      })
    );
  } catch (error) {
    if (awsErrorName(error) === "InvalidPermission.Duplicate") return;
    wrapError("allowRdpIngress", error);
  }
}

export async function launchWindowsInstance(
  input: LaunchWindowsInstanceInput = {},
  ec2: EC2Client = defaultClient
): Promise<string> {
  try {
    const result = await ec2.send(
      new RunInstancesCommand({
        ImageId: input.imageId ?? defaultWindowsAmiId,
        InstanceType: input.instanceType ?? defaultInstanceType,
        MinCount: 1,
        MaxCount: 1,
        KeyName: input.keyName ?? defaultKeyName,
        SecurityGroupIds: input.securityGroupIds,
        UserData: input.userData ? Buffer.from(input.userData).toString("base64") : undefined,
        TagSpecifications: [
          {
            ResourceType: "instance",
            Tags: [
              { Key: "Name", Value: input.name ?? defaultInstanceName },
              { Key: "Lab", Value: "aws-cloudfolks-windows-ec2" },
            ],
          },
        ],
      })
    );

    const instanceId = result.Instances?.[0]?.InstanceId;
    if (!instanceId) throw new Error("RunInstances returned no InstanceId");
    return instanceId;
  } catch (error) {
    wrapError("launchWindowsInstance", error);
  }
}

export async function describeInstance(instanceId: string, ec2: EC2Client = defaultClient): Promise<Instance | undefined> {
  try {
    const result = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
    return result.Reservations?.flatMap((reservation) => reservation.Instances ?? [])[0];
  } catch (error) {
    wrapError("describeInstance", error);
  }
}

export async function listLabInstances(ec2: EC2Client = defaultClient): Promise<Instance[]> {
  try {
    const filters: Filter[] = [
      { Name: "tag:Lab", Values: ["aws-cloudfolks-windows-ec2"] },
      { Name: "instance-state-name", Values: ["pending", "running", "stopping", "stopped"] },
    ];
    const result = await ec2.send(new DescribeInstancesCommand({ Filters: filters }));
    return result.Reservations?.flatMap((reservation) => reservation.Instances ?? []) ?? [];
  } catch (error) {
    wrapError("listLabInstances", error);
  }
}

export async function waitForInstanceState(
  instanceId: string,
  expectedState: string,
  ec2: EC2Client = defaultClient,
  timeoutMs = 30000
): Promise<Instance> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const instance = await describeInstance(instanceId, ec2);
    if (instance?.State?.Name === expectedState) return instance;
    await sleep(1000);
  }
  throw new Ec2WindowsLabError("WAIT_TIMEOUT", `Instance ${instanceId} did not reach ${expectedState}`);
}

export async function terminateInstance(instanceId: string, ec2: EC2Client = defaultClient): Promise<void> {
  try {
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] }));
  } catch (error) {
    wrapError("terminateInstance", error);
  }
}

export async function terminateLabInstances(ec2: EC2Client = defaultClient): Promise<string[]> {
  const instances = await listLabInstances(ec2);
  const ids = instances.flatMap((instance) => (instance.InstanceId ? [instance.InstanceId] : []));
  if (ids.length === 0) return [];
  try {
    await ec2.send(new TerminateInstancesCommand({ InstanceIds: ids }));
    return ids;
  } catch (error) {
    wrapError("terminateLabInstances", error);
  }
}

export async function deleteSecurityGroup(
  groupName = defaultSecurityGroupName,
  ec2: EC2Client = defaultClient
): Promise<void> {
  try {
    const group = await findSecurityGroupByName(groupName, ec2);
    if (!group) return;
    await ec2.send(new DeleteSecurityGroupCommand({ GroupId: group.groupId }));
  } catch (error) {
    const name = awsErrorName(error);
    if (name === "InvalidGroup.NotFound" || name === "DependencyViolation") return;
    wrapError("deleteSecurityGroup", error);
  }
}

export async function tagResource(
  resourceId: string,
  tags: Record<string, string>,
  ec2: EC2Client = defaultClient
): Promise<void> {
  try {
    await ec2.send(
      new CreateTagsCommand({
        Resources: [resourceId],
        Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
      })
    );
  } catch (error) {
    wrapError("tagResource", error);
  }
}
