import { describe, it, expect, beforeAll, vi } from "vitest";
import type { _Record as StreamRecord, DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { DynamoDBStreamsError } from "../src/errors.js";
import { listTableStreams, readRecords, summarizeRecord, summarizeRecords } from "../src/use-cases/streams.js";

function failingClient(name: string): DynamoDBStreamsClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as DynamoDBStreamsClient;
}

describe("DynamoDB Streams", () => {
  beforeAll(async () => {
    await waitForFloci();
  });

  it("client is configured against Floci", () => {
    expect(client).toBeDefined();
  });

  it("summarizes stream records for lambda handlers", () => {
    const record: StreamRecord = {
      eventName: "INSERT",
      dynamodb: { Keys: { pk: { S: "A" } }, NewImage: { pk: { S: "A" } }, SequenceNumber: "1" },
    };

    expect(summarizeRecord(record)).toMatchObject({ eventName: "INSERT", sequenceNumber: "1" });
    expect(summarizeRecords([record])).toHaveLength(1);
  });

  it("wraps SDK list failures in DynamoDBStreamsError", async () => {
    await expect(listTableStreams("x", failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "DYNAMODB_STREAMS_AccessDeniedException",
      message: "DynamoDB Streams listTableStreams failed",
    } satisfies Partial<DynamoDBStreamsError>);
  });

  it("wraps nested read failures in DynamoDBStreamsError", async () => {
    await expect(readRecords("arn:stream", 1, failingClient("ResourceNotFoundException"))).rejects.toMatchObject({
      code: "DYNAMODB_STREAMS_ResourceNotFoundException",
      message: "DynamoDB Streams readRecords failed",
    } satisfies Partial<DynamoDBStreamsError>);
  });
});
