import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { kubeconfigName } from "../src/use-cases/clusters.js";
describe("EKS",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds cluster ARN",()=>expect(kubeconfigName("c")).toContain("cluster/c"));});
