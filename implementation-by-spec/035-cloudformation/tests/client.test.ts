import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { s3BucketTemplate } from "../src/use-cases/stacks.js";
describe("CloudFormation",()=>{beforeAll(async()=>waitForFloci()); it("client configured",()=>expect(client).toBeDefined()); it("builds templates",()=>expect(s3BucketTemplate("b")).toContain("AWS::S3::Bucket"));});
