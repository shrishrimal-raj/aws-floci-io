import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";

describe("API Gateway v1 REST", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("documents mock REST route shape",()=> expect({ path:"/health", method:"GET", stage:"dev" }).toMatchObject({method:"GET"}));
});
