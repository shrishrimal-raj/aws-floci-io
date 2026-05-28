import { CreateChangeSetCommand, DetectStackDriftCommand, type CloudFormationClient } from "@aws-sdk/client-cloudformation";

export function vpcTemplate(): Record<string, unknown> {
  return {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "Phase 06 VPC with public/private subnets",
    Resources: {
      Vpc: { Type: "AWS::EC2::VPC", Properties: { CidrBlock: "10.0.0.0/16", EnableDnsHostnames: true, EnableDnsSupport: true } },
      PublicSubnetA: { Type: "AWS::EC2::Subnet", Properties: { VpcId: { Ref: "Vpc" }, CidrBlock: "10.0.0.0/24", AvailabilityZone: { "Fn::Select": [0, { "Fn::GetAZs": "" }] } } },
      PrivateSubnetA: { Type: "AWS::EC2::Subnet", Properties: { VpcId: { Ref: "Vpc" }, CidrBlock: "10.0.10.0/24", AvailabilityZone: { "Fn::Select": [0, { "Fn::GetAZs": "" }] } } },
      PublicSubnetB: { Type: "AWS::EC2::Subnet", Properties: { VpcId: { Ref: "Vpc" }, CidrBlock: "10.0.1.0/24", AvailabilityZone: { "Fn::Select": [1, { "Fn::GetAZs": "" }] } } },
      PrivateSubnetB: { Type: "AWS::EC2::Subnet", Properties: { VpcId: { Ref: "Vpc" }, CidrBlock: "10.0.11.0/24", AvailabilityZone: { "Fn::Select": [1, { "Fn::GetAZs": "" }] } } },
    },
    Outputs: { VpcId: { Value: { Ref: "Vpc" } } },
  };
}

export function validateTemplateBasics(template: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!template.Resources || typeof template.Resources !== "object") errors.push("Resources missing");
  const resources = template.Resources as Record<string, { Type?: string }>;
  if (!Object.values(resources).some((resource) => resource.Type === "AWS::EC2::VPC")) errors.push("VPC missing");
  if (Object.values(resources).filter((resource) => resource.Type === "AWS::EC2::Subnet").length < 2) errors.push("at least two subnets required");
  return errors;
}

export class StackManager {
  constructor(private readonly cloudFormation: CloudFormationClient) {}

  async createChangeSet(stackName: string, template: Record<string, unknown>): Promise<string | undefined> {
    const result = await this.cloudFormation.send(
      new CreateChangeSetCommand({ StackName: stackName, ChangeSetName: `${stackName}-${Date.now()}`, ChangeSetType: "CREATE", TemplateBody: JSON.stringify(template), Capabilities: ["CAPABILITY_IAM"] })
    );
    return result.Id;
  }

  async detectDrift(stackName: string): Promise<string | undefined> {
    const result = await this.cloudFormation.send(new DetectStackDriftCommand({ StackName: stackName }));
    return result.StackDriftDetectionId;
  }
}
