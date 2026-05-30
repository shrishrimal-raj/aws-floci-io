import { describe, expect, it } from "vitest";
import { buildOrdersApiDeliveryExample, buildPaymentsComplianceDeliveryExample, buildSaasWorkerDeliveryExample } from "../src/index.js";

describe("enterprise delivery examples", () => {
  it("builds orders API blue/green example", () => {
    const example = buildOrdersApiDeliveryExample();
    expect(example.strategy).toBe("blue_green");
    expect(example.functions).toContain("createObservabilityRunbook");
    expect(example.implementation).toHaveProperty("disasterRecovery");
  });

  it("builds payments compliance canary example", () => {
    const example = buildPaymentsComplianceDeliveryExample();
    expect(example.strategy).toBe("canary");
    expect(example.implementation.guardrails).toMatchObject({ approved: true });
    expect(example.functions).toContain("createArtifactLifecyclePolicy");
  });

  it("builds SaaS event-driven worker example", () => {
    const example = buildSaasWorkerDeliveryExample();
    expect(example.strategy).toBe("rolling");
    expect(example.scenario).toContain("EventBridge");
    expect(example.implementation).toHaveProperty("retry");
  });
});
