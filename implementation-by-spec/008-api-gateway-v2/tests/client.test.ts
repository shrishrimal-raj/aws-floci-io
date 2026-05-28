import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { httpResponse } from "../src/use-cases/http-api.js";

describe("API Gateway v2 HTTP", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("builds HTTP API proxy responses",()=> expect(httpResponse(200,{ok:true}).statusCode).toBe(200));
});
