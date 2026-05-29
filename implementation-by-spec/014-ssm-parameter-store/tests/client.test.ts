import { describe, it, expect, beforeAll, vi } from "vitest";
import type { SSMClient } from "@aws-sdk/client-ssm";
import { waitForFloci } from "@floci-lab/test-utils";
import { client } from "../src/client.js";
import type { SSMParameterStoreError } from "../src/errors.js";
import { appConfig, getStringParameter, parameterPath, putStringParameter } from "../src/use-cases/parameters.js";

function failingClient(name: string): SSMClient {
  return {
    send: vi.fn(async () => {
      const error = new Error(`${name} failed`);
      error.name = name;
      throw error;
    }),
  } as unknown as SSMClient;
}

describe("SSM Parameter Store", () => {
  beforeAll(async () => waitForFloci());

  it("client is configured against Floci", () => expect(client).toBeDefined());

  it("builds hierarchical paths and typed config holders", () => {
    expect(parameterPath("app", "dev", "db/url")).toBe("/app/dev/db/url");
    expect(appConfig("/app/dev/features", { beta: true })).toMatchObject({ path: "/app/dev/features" });
  });

  it("wraps write failures in SSMParameterStoreError", async () => {
    await expect(putStringParameter("/x", "y", false, failingClient("AccessDeniedException"))).rejects.toMatchObject({
      code: "SSM_PARAMETER_STORE_AccessDeniedException",
      message: "SSM Parameter Store putStringParameter failed",
    } satisfies Partial<SSMParameterStoreError>);
  });

  it("wraps read failures in SSMParameterStoreError", async () => {
    await expect(getStringParameter("/x", true, failingClient("ParameterNotFound"))).rejects.toMatchObject({
      code: "SSM_PARAMETER_STORE_ParameterNotFound",
      message: "SSM Parameter Store getStringParameter failed",
    } satisfies Partial<SSMParameterStoreError>);
  });
});
