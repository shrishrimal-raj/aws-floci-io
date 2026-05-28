import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { kafkaBootstrapUrl } from "../src/use-cases/clusters.js";
describe("MSK Kafka",()=>{beforeAll(async()=>waitForFloci()); it("client is configured against Floci",()=>expect(client).toBeDefined()); it("builds bootstrap urls",()=>expect(kafkaBootstrapUrl(["a:9092","b:9092"])).toBe("a:9092,b:9092"));});
