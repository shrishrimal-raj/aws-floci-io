import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { handlerResponse } from "../src/use-cases/functions.js";

describe("Lambda", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("builds API-style handler responses",()=>{
    expect(handlerResponse(200,{ok:true})).toEqual({ statusCode:200, headers:{"content-type":"application/json"}, body:'{"ok":true}' });
  });
});
