import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { appspec } from "../src/use-cases/deployments.js";
describe("CodeDeploy",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds appspec",()=>expect(appspec([{source:"/",destination:"/app"}])).toContain("/app"));});
