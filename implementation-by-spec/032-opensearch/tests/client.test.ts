import { describe, it, expect, beforeAll, vi } from "vitest";
import type { OpenSearchClient } from "@aws-sdk/client-opensearch";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { OpenSearchError } from "../src/errors.js";
import { createDomain, describeDomain, indexMapping } from "../src/use-cases/domains.js";

function failingClient(name: string): OpenSearchClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as OpenSearchClient;
}

describe("OpenSearch", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect(indexMapping({ title: "text" }).mappings.properties.title?.type).toBe("text"); });
  it("wraps primary failures", async () => {
    await expect(createDomain("d", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "OPENSEARCH_AccessDeniedException", message: "OpenSearch createDomain failed" } satisfies Partial<OpenSearchError>);
  });
  it("wraps secondary failures", async () => {
    await expect(describeDomain("d", failingClient("ResourceNotFoundException"))).rejects.toMatchObject({ code: "OPENSEARCH_ResourceNotFoundException", message: "OpenSearch describeDomain failed" } satisfies Partial<OpenSearchError>);
  });
});
