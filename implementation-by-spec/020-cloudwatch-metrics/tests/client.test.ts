import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { emfMetric } from "../src/use-cases/metrics.js";
describe("CloudWatch Metrics",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds EMF",()=>expect(emfMetric("App",{Count:1})._aws.CloudWatchMetrics[0]!.Namespace).toBe("App"));});
