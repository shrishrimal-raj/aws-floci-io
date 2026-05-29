import { describe, it, expect, beforeAll, vi } from "vitest";
import type {
  _Record as StreamRecord,
  DynamoDBStreamsClient,
} from "@aws-sdk/client-dynamodb-streams";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { DynamoDBStreamsError } from "../src/errors.js";
import {
  attributeMapToJson,
  createStreamAuditEvent,
  estimateStreamConsumerCost,
  filterRecordsByEventName,
  listTableStreams,
  processStreamRecords,
  readRecords,
  streamLagSnapshot,
  streamRecordIdempotencyKey,
  summarizeRecord,
  summarizeRecords,
} from "../src/use-cases/streams.js";

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
      dynamodb: {
        Keys: { pk: { S: "A" } },
        NewImage: { pk: { S: "A" } },
        SequenceNumber: "1",
      },
    };

    expect(summarizeRecord(record)).toMatchObject({
      eventName: "INSERT",
      sequenceNumber: "1",
    });
    expect(summarizeRecords([record])).toHaveLength(1);
    expect(attributeMapToJson(record.dynamodb?.NewImage)).toEqual({ pk: "A" });
    expect(streamRecordIdempotencyKey(record)).toBe("ddb-stream#INSERT#pk=A#1");
    expect(
      createStreamAuditEvent(record, "Project", "PROCESSED"),
    ).toMatchObject({ action: "Project", outcome: "PROCESSED" });
  });

  it("filters, processes, measures lag, and estimates consumer cost", async () => {
    const old = new Date(Date.now() - 120_000);
    const records: StreamRecord[] = [
      {
        eventName: "INSERT",
        dynamodb: {
          Keys: { pk: { S: "A" } },
          SequenceNumber: "1",
          ApproximateCreationDateTime: old,
        },
      },
      {
        eventName: "REMOVE",
        dynamodb: {
          Keys: { pk: { S: "B" } },
          SequenceNumber: "2",
          ApproximateCreationDateTime: new Date(),
        },
      },
    ];

    expect(filterRecordsByEventName(records, "INSERT")).toHaveLength(1);
    await expect(
      processStreamRecords(
        records,
        async (record) => record.eventName !== "REMOVE",
      ),
    ).resolves.toMatchObject({
      received: 2,
      processed: 1,
      skipped: 1,
      failed: 0,
    });
    expect(streamLagSnapshot(records, 60_000).alarmHints).toContain(
      "IteratorAgeHigh",
    );
    expect(
      estimateStreamConsumerCost({ recordsPerMonth: 1_000_000, batchSize: 100 })
        .estimatedInvocations,
    ).toBe(10_000);
  });

  it("wraps SDK list failures in DynamoDBStreamsError", async () => {
    await expect(
      listTableStreams("x", failingClient("AccessDeniedException")),
    ).rejects.toMatchObject({
      code: "DYNAMODB_STREAMS_AccessDeniedException",
      message: "DynamoDB Streams listTableStreams failed",
    } satisfies Partial<DynamoDBStreamsError>);
  });

  it("wraps nested read failures in DynamoDBStreamsError", async () => {
    await expect(
      readRecords("arn:stream", 1, failingClient("ResourceNotFoundException")),
    ).rejects.toMatchObject({
      code: "DYNAMODB_STREAMS_ResourceNotFoundException",
      message: "DynamoDB Streams readRecords failed",
    } satisfies Partial<DynamoDBStreamsError>);
  });
});
