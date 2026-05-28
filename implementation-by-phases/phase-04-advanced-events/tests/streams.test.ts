import { describe, expect, it } from "vitest";
import { ClickStream, FirehoseSink, detectHotPartition, mapDynamoStreamRecord, partitionKeyForClick } from "../src/streams.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return {};
  }
}

describe("Kinesis, Firehose, and DynamoDB Streams", () => {
  it("uses tenant + session partition key to avoid hot shards", () => {
    const event = { tenantId: "tenant-a", sessionId: "session-1", path: "/checkout", at: "now" };
    expect(partitionKeyForClick(event)).toBe("tenant-a#session-1");
    expect(detectHotPartition(["a", "a", "a", "b"], 0.5)).toBe("a");
  });

  it("puts click event to Kinesis", async () => {
    const client = new FakeClient();
    await new ClickStream(client as never, "clicks").put({ tenantId: "t", sessionId: "s", path: "/", at: "now" });
    expect(client.commands[0]?.constructor.name).toBe("PutRecordCommand");
  });

  it("puts records to Firehose", async () => {
    const client = new FakeClient();
    await new FirehoseSink(client as never, "to-s3").put({ event: "OrderPlaced" });
    expect(client.commands[0]?.constructor.name).toBe("PutRecordCommand");
  });

  it("maps DynamoDB stream record changes", () => {
    expect(mapDynamoStreamRecord({ eventName: "INSERT", dynamodb: { Keys: { pk: { S: "1" } }, NewImage: { total: { N: "42" } } } })).toMatchObject({ eventName: "INSERT" });
  });
});
