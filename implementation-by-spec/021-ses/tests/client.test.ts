import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { template } from "../src/use-cases/email.js";
describe("SES",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("renders templates",()=>expect(template("Hi {{name}}",{name:"Ada"})).toBe("Hi Ada"));});
