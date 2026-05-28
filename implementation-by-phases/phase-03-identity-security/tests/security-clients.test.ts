import { describe, expect, it } from "vitest";
import { createSecurityClients } from "../src/security-clients.js";

describe("security AWS clients", () => {
  it("creates Phase 03 service clients", () => {
    const clients = createSecurityClients({ endpoint: "http://localhost:4566" });
    expect(clients.cognito.constructor.name).toBe("CognitoIdentityProviderClient");
    expect(clients.iam.constructor.name).toBe("IAMClient");
    expect(clients.sts.constructor.name).toBe("STSClient");
    expect(clients.kms.constructor.name).toBe("KMSClient");
    expect(clients.acm.constructor.name).toBe("ACMClient");
  });
});
