import { describe, expect, it } from "vitest";
import { AthenaQueries, GlueCatalog, createEventsTableInput, lakePrefix, requirePartitionPredicate } from "../src/data-lake.js";

class FakeClient {
  commands: unknown[] = [];
  constructor(private readonly response: unknown = {}) {}
  async send(command: unknown) { this.commands.push(command); return this.response; }
}

describe("Glue + Athena data lake", () => {
  it("builds bronze/silver/gold partition prefixes", () => {
    expect(lakePrefix("bronze", "click", { tenantId: "t", year: "2026", month: "05", day: "28" })).toBe("bronze/event_type=click/tenant_id=t/year=2026/month=05/day=28/");
  });

  it("guards Athena cost with partition predicate", () => {
    expect(requirePartitionPredicate("select * from events where tenant_id='t' and year='2026' and month='05' and day='28'")).toBe(true);
    expect(requirePartitionPredicate("select * from events")).toBe(false);
  });

  it("creates explicit Glue table definition", () => {
    const input = createEventsTableInput("analytics", "events", "s3://bucket/silver/");
    expect(input.TableInput?.PartitionKeys?.map((key) => key.Name)).toEqual(["tenant_id", "year", "month", "day"]);
  });

  it("starts Athena queries only with partitions", async () => {
    const client = new FakeClient({ QueryExecutionId: "q1" });
    await expect(new AthenaQueries(client as never).start("select * from events where tenant_id='t' and year='2026' and month='05' and day='28'")).resolves.toBe("q1");
    await expect(new AthenaQueries(client as never).start("select * from events")).rejects.toThrow("partition predicate");
  });

  it("sends Glue database/table commands", async () => {
    const client = new FakeClient();
    const catalog = new GlueCatalog(client as never);
    await catalog.ensureDatabase("analytics");
    await catalog.createEventsTable("analytics", "events", "s3://bucket/");
    expect(client.commands.map((command) => command?.constructor.name)).toEqual(["CreateDatabaseCommand", "CreateTableCommand"]);
  });
});
