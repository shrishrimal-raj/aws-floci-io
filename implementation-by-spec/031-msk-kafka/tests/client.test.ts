import { describe, it, expect, beforeAll, vi } from "vitest";
import type { KafkaClient } from "@aws-sdk/client-kafka";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { MSKKafkaError } from "../src/errors.js";
import { createMskCluster, describeMskCluster, kafkaBootstrapUrl } from "../src/use-cases/clusters.js";

function failingClient(name: string): KafkaClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as KafkaClient;
}

describe("MSK Kafka", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(kafkaBootstrapUrl(["b1:9092", "b2:9092"])).toBe("b1:9092,b2:9092"); });
  it("wraps primary failures", async () => {
    await expect(createMskCluster("c", ["subnet-1"], ["sg-1"], failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "MSK_KAFKA_AccessDeniedException", message: "MSK Kafka createMskCluster failed" } satisfies Partial<MSKKafkaError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeMskCluster("arn", failingClient("NotFoundException"))).rejects.toMatchObject({ code: "MSK_KAFKA_NotFoundException", message: "MSK Kafka describeMskCluster failed" } satisfies Partial<MSKKafkaError>);
  });
});
