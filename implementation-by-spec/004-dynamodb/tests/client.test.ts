import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import { createSingleTable, deleteTable, getItem, putItem, queryByPk, queryGsi, updateJsonPatch } from "../src/use-cases/table.js";
const table = `floci-ddb-test-${Date.now()}`;
describe("DynamoDB", () => {
  beforeAll(async()=>{ await waitForFloci(); await createSingleTable(table); });
  afterAll(async()=>{ await deleteTable(table); });
  it("client is configured against Floci",()=> expect(client).toBeDefined());
  it("writes, reads, updates, and queries single-table items", async()=>{
    await putItem({ pk:{S:"USER#1"}, sk:{S:"PROFILE"}, name:{S:"Ada"}, gsi1pk:{S:"EMAIL#ada@example.com"}, gsi1sk:{S:"USER#1"} }, table);
    expect((await getItem("USER#1","PROFILE",table))?.name?.S).toBe("Ada");
    await updateJsonPatch("USER#1","PROFILE",{ name:"Grace" },table);
    expect((await getItem("USER#1","PROFILE",table))?.name?.S).toBe("Grace");
    expect(await queryByPk("USER#1",table)).toHaveLength(1);
    expect(await queryGsi("EMAIL#ada@example.com",table)).toHaveLength(1);
  });
});
