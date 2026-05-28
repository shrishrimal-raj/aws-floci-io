import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { policyDocument } from "../src/use-cases/access.js";

describe("IAM", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("builds least-privilege policy documents",()=> expect(policyDocument(["s3:GetObject"],["arn"])).toContain("s3:GetObject"));
});
