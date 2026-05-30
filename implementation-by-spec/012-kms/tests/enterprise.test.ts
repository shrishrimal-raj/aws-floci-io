import { describe, expect, it } from "vitest";
import type { KMSClient } from "@aws-sdk/client-kms";
import { buildKmsDisasterRecoveryExample } from "../src/examples/disaster-recovery-runbook.js";
import { buildKeyPolicyComplianceExample } from "../src/examples/key-policy-compliance.js";
import {
  applicationKeyPolicy,
  estimateKmsMonthlyRequestCost,
  kmsAuditEvent,
  kmsBackoffDelayMs,
  kmsComplianceFindings,
  kmsDisasterRecoveryRunbook,
  kmsLifecycleEvent,
  retryKmsOperation,
  tenantEncryptionContext,
} from "../src/use-cases/enterprise.js";
import { decryptString, encryptString, generateDataKey } from "../src/use-cases/crypto.js";

class InspectingClient {
  commands: unknown[] = [];
  constructor(private readonly response: unknown) {}
  async send(command: unknown) {
    this.commands.push(command);
    return this.response;
  }
}

describe("KMS enterprise patterns", () => {
  it("binds encrypt, decrypt, and data-key calls to encryption context", async () => {
    const context = tenantEncryptionContext({ tenantId: "tenant-1", workload: "orders", purpose: "pii" });
    const encryptClient = new InspectingClient({ CiphertextBlob: new Uint8Array([1, 2, 3]) });
    await encryptString("key-1", "secret", encryptClient as unknown as KMSClient, context);
    expect((encryptClient.commands[0] as { input: { EncryptionContext: Record<string, string> } }).input.EncryptionContext).toEqual(context);

    const decryptClient = new InspectingClient({ Plaintext: new TextEncoder().encode("secret") });
    await expect(decryptString(new Uint8Array([1]), decryptClient as unknown as KMSClient, context)).resolves.toBe("secret");
    expect((decryptClient.commands[0] as { input: { EncryptionContext: Record<string, string> } }).input.EncryptionContext).toEqual(context);

    const dataKeyClient = new InspectingClient({ Plaintext: new Uint8Array(32), CiphertextBlob: new Uint8Array(64) });
    await generateDataKey("key-1", 32, dataKeyClient as unknown as KMSClient, context);
    expect((dataKeyClient.commands[0] as { input: { EncryptionContext: Record<string, string> } }).input.EncryptionContext).toEqual(context);
  });

  it("creates audit, policy, lifecycle, cost, compliance, and DR artifacts", () => {
    const context = { tenantId: "tenant-1", actorId: "orders-api", requestId: "req-1", workload: "orders" };
    expect(kmsAuditEvent({ action: "Decrypt", keyRef: "alias/orders", result: "ALLOW", context }, new Date("2024-06-01T00:00:00Z")).timestamp).toBe("2024-06-01T00:00:00.000Z");
    expect(JSON.stringify(applicationKeyPolicy({ accountId: "123", adminRoleArn: "arn:admin", appRoleArn: "arn:app", aliasName: "alias/orders" }))).toContain("kms:RequestAlias");
    expect(kmsLifecycleEvent({ keyRef: "alias/orders", eventType: "RotationEnabled", actorId: "admin", reason: "policy" }).DetailType).toBe("KmsRotationEnabled");
    expect(estimateKmsMonthlyRequestCost(1_000_000)).toBe(3);
    expect(kmsComplianceFindings({ aliasName: "alias/orders", rotationEnabled: true, encryptionContextKeys: ["tenantId", "workload", "purpose"], tags: { Owner: "team", DataClass: "restricted" }, deletionWindowDays: 30 }).every((finding) => finding.status === "PASS")).toBe(true);
    expect(kmsDisasterRecoveryRunbook("us-east-1", "us-west-2", "alias/orders")).toHaveLength(5);
  });

  it("retries throttled operations and keeps example builders executable", async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const result = await retryKmsOperation(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error("throttled");
          error.name = "ThrottlingException";
          throw error;
        }
        return "ok";
      },
      { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000, retryableErrors: ["ThrottlingException"] },
      async (ms) => {
        sleeps.push(ms);
      }
    );
    expect(result).toBe("ok");
    expect(sleeps).toEqual([kmsBackoffDelayMs(1, { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1_000 })]);
    expect(buildKeyPolicyComplianceExample().compliance.map((finding) => finding.control)).toContain("rotation");
    expect(buildKmsDisasterRecoveryExample().runbook[3]?.action).toContain("decrypt smoke test");
  });
});
