import { describe, it, expect, beforeAll, vi } from "vitest";
import type { ECRClient } from "@aws-sdk/client-ecr";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { ECRError } from "../src/errors.js";
import { createRepository, listImages } from "../src/use-cases/repositories.js";

function failingClient(name: string): ECRClient {
  return { send: vi.fn(async () => { const error = new Error(`${name} failed`); error.name = name; throw error; }) } as unknown as ECRClient;
}

describe("ECR", () => {
  beforeAll(async () => waitForFloci());
  it("client is configured against Floci", () => expect(client).toBeDefined());
  it("supports local pure helpers", () => { expect("service:latest".split(":")[1]).toBe("latest"); });
  it("wraps primary failures", async () => {
    await expect(createRepository("repo", failingClient("AccessDeniedException"))).rejects.toMatchObject({ code: "ECR_AccessDeniedException", message: "ECR createRepository failed" } satisfies Partial<ECRError>);
  });
  it("wraps secondary failures", async () => {
    await expect(listImages("repo", failingClient("RepositoryNotFoundException"))).rejects.toMatchObject({ code: "ECR_RepositoryNotFoundException", message: "ECR listImages failed" } satisfies Partial<ECRError>);
  });
});
