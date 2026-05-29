import { describe, it, expect, beforeAll, vi } from "vitest";
import type { EKSClient } from "@aws-sdk/client-eks";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { EKSError } from "../src/errors.js";
import { createEksCluster, describeEksCluster, kubeconfigName } from "../src/use-cases/clusters.js";

function failingClient(name: string): EKSClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as EKSClient;
}

describe("EKS", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(kubeconfigName("demo")).toContain("cluster/demo"); });
  it("wraps primary failures", async () => {
    await expect(createEksCluster("c", ["subnet-1"], "role", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "EKS_AccessDeniedException", message: "EKS createEksCluster failed" } satisfies Partial<EKSError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeEksCluster("c", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "EKS_ResourceNotFoundException", message: "EKS describeEksCluster failed" } satisfies Partial<EKSError>);
  });
});
