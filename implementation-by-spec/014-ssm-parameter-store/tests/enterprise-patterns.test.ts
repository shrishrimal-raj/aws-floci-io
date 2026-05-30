import { describe, expect, it, vi } from "vitest";
import type { SSMClient } from "@aws-sdk/client-ssm";
import {
  buildParameterAuditLog,
  getRequiredStringParameter,
  loadServiceRuntimeConfig,
  parameterCostOptimizationPlan,
  parameterDisasterRecoveryPlan,
  parameterLifecyclePolicy,
  parameterPathReadPolicy,
  seedServiceRuntimeConfig,
  withParameterStoreRetry,
} from "../src/index.js";

function memorySsm(): SSMClient {
  const values = new Map<string, string>();
  return {
    send: vi.fn(async (command: { constructor: { name: string }; input?: Record<string, unknown> }) => {
      const input = command.input ?? {};
      if (command.constructor.name === "PutParameterCommand") {
        values.set(String(input.Name), String(input.Value));
        return {};
      }
      if (command.constructor.name === "GetParameterCommand") {
        const value = values.get(String(input.Name));
        return { Parameter: value ? { Name: input.Name, Value: value } : undefined };
      }
      if (command.constructor.name === "GetParametersByPathCommand") {
        const path = String(input.Path);
        return {
          Parameters: [...values.entries()].filter(([name]) => name.startsWith(path)).map(([Name, Value]) => ({ Name, Value })),
        };
      }
      return {};
    }),
  } as unknown as SSMClient;
}

describe("SSM enterprise patterns", () => {
  it("retries transient operations", async () => {
    const op = vi.fn().mockRejectedValueOnce(Object.assign(new Error("throttle"), { name: "ThrottlingException" })).mockResolvedValue("ok");
    await expect(withParameterStoreRetry(op, { maxAttempts: 2, baseDelayMs: 1, backoffRate: 2, retryableErrors: ["ThrottlingException"] })).resolves.toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("builds secure access, audit, lifecycle, cost, and DR plans", () => {
    expect(buildParameterAuditLog({ eventId: "e1", actor: "role", action: "GetParameter", parameterName: "/app/prod/db", outcome: "ALLOW" }).at).toBeTruthy();
    expect(parameterPathReadPolicy("/app/prod", "us-east-1", "123", "app")).toMatchObject({ Version: "2012-10-17" });
    expect(parameterLifecyclePolicy({ path: "/app/prod/db", owner: "platform", classification: "restricted", maxAgeDays: 365, backupRequired: true })).toMatchObject({ backupRequired: true });
    expect(parameterCostOptimizationPlan("/app/prod", 2000)).toMatchObject({ cacheTtlSeconds: 300, batchReads: true });
    expect(parameterDisasterRecoveryPlan("orders", "prod", "us-west-2").restoreRunbook).toHaveLength(4);
  });

  it("seeds and loads enterprise service runtime config", async () => {
    const ssm = memorySsm();
    await seedServiceRuntimeConfig({ serviceName: "orders", environment: "test", databaseUrl: "postgres://db", featureFlags: { checkoutV2: true }, apiTimeoutMs: 1500 }, ssm);
    await expect(loadServiceRuntimeConfig("orders", "test", ssm)).resolves.toMatchObject({ databaseUrl: "postgres://db", apiTimeoutMs: 1500, featureFlags: { checkoutV2: true } });
    await expect(getRequiredStringParameter("/orders/test/db-url", ssm)).resolves.toBe("postgres://db");
  });
});
