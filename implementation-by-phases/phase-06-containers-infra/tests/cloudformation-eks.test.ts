import { describe, expect, it } from "vitest";
import { StackManager, validateTemplateBasics, vpcTemplate } from "../src/cloudformation.js";
import { deploymentManifest, irsaTrustPolicy, serviceAccountManifest } from "../src/eks-irsa.js";

class FakeClient {
  commands: unknown[] = [];
  constructor(private readonly response: unknown = {}) {}
  async send(command: unknown) { this.commands.push(command); return this.response; }
}

describe("CloudFormation and EKS IRSA", () => {
  it("creates valid VPC template", () => {
    const template = vpcTemplate();
    expect(validateTemplateBasics(template)).toEqual([]);
    expect(Object.keys(template.Resources as Record<string, unknown>)).toContain("Vpc");
  });

  it("creates change set and drift detection commands", async () => {
    const client = new FakeClient({ Id: "change-1", StackDriftDetectionId: "drift-1" });
    const manager = new StackManager(client as never);
    await manager.createChangeSet("network", vpcTemplate());
    await manager.detectDrift("network");
    expect(client.commands.map((command) => command?.constructor.name)).toEqual(["CreateChangeSetCommand", "DetectStackDriftCommand"]);
  });

  it("builds IRSA trust and Kubernetes manifests", () => {
    const trust = irsaTrustPolicy({ accountId: "123", oidcProviderArn: "arn:oidc", oidcProviderHost: "oidc.eks/id/1", namespace: "apps", serviceAccount: "catalog" });
    expect(JSON.stringify(trust)).toContain("system:serviceaccount:apps:catalog");
    expect(serviceAccountManifest("apps", "catalog", "arn:role")).toMatchObject({ kind: "ServiceAccount" });
    expect(deploymentManifest("catalog", "image", "catalog", 3000)).toMatchObject({ kind: "Deployment" });
  });
});
