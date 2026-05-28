import { describe, it, expect, beforeAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { summarizeRecord } from "../src/use-cases/streams.js";

describe("DynamoDB Streams", () => {
  beforeAll(async()=>{ await waitForFloci(); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("summarizes stream records for lambda handlers",()=>{
    expect(summarizeRecord({ eventName:"INSERT", dynamodb:{ Keys:{ pk:{S:"A"} }, NewImage:{ pk:{S:"A"} }, SequenceNumber:"1" } }).eventName).toBe("INSERT");
  });
});
