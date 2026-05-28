import { describe, expect, it } from "vitest";
import { zeroTrustUserPoolPlan, CognitoProvisioner } from "../src/cognito.js";
import { KmsSecretStore, tenantEncryptionContext } from "../src/kms-secret-store.js";
import { CrossAccountAccess, CertificateManager, auditEvent } from "../src/sts-acm-audit.js";

class FakeClient {
  commands: unknown[] = [];
  constructor(private readonly responses: unknown[] = []) {}
  async send(command: unknown) {
    this.commands.push(command);
    return this.responses.shift() ?? {};
  }
}

describe("Cognito, KMS, STS, ACM helpers", () => {
  it("plans zero-trust Cognito user pool", () => {
    expect(zeroTrustUserPoolPlan()).toMatchObject({ mfaRequired: true, hostedUiFallback: true, customAttributes: ["tenant_id", "role", "plan"] });
  });

  it("invites user with tenant custom attribute", async () => {
    const client = new FakeClient();
    await new CognitoProvisioner(client as never).inviteUser("pool-1", "user@example.com", "tenant-a");
    expect(client.commands[0]?.constructor.name).toBe("AdminCreateUserCommand");
  });

  it("encrypts JSON with tenant encryption context", async () => {
    const client = new FakeClient([{ CiphertextBlob: Buffer.from("cipher") }]);
    const store = new KmsSecretStore(client as never, "key-1");
    await expect(store.encryptJson({ secret: true }, tenantEncryptionContext("tenant-a", "api-key"))).resolves.toMatchObject({ keyId: "key-1" });
    expect(client.commands[0]?.constructor.name).toBe("EncryptCommand");
  });

  it("assumes cross-account role with external id", async () => {
    const client = new FakeClient([{ Credentials: { AccessKeyId: "a", SecretAccessKey: "s", SessionToken: "t" } }]);
    await expect(new CrossAccountAccess(client as never).assumeTenantRole("arn:aws:iam::111:role/x", "tenant-a", "ext-1")).resolves.toMatchObject({ accessKeyId: "a" });
    expect(client.commands[0]?.constructor.name).toBe("AssumeRoleCommand");
  });

  it("requests DNS-validated ACM certificate and emits audit events", async () => {
    const client = new FakeClient([{ CertificateArn: "arn:aws:acm:us-east-1:123:certificate/1" }]);
    await expect(new CertificateManager(client as never).requestDnsValidatedCertificate("app.example.com")).resolves.toContain("certificate/1");
    expect(auditEvent({ tenantId: "tenant-a", actor: "user-1", action: "kms:Decrypt", resource: "key-1", decision: "allow" })).toMatchObject({ tenantId: "tenant-a" });
  });
});
