import { RequestCertificateCommand, type ACMClient } from "@aws-sdk/client-acm";
import { AssumeRoleCommand, type STSClient } from "@aws-sdk/client-sts";

export interface AssumedRoleSession {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration?: Date;
}

export class CrossAccountAccess {
  constructor(private readonly sts: STSClient) {}

  async assumeTenantRole(roleArn: string, tenantId: string, externalId: string): Promise<AssumedRoleSession> {
    const result = await this.sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `tenant-${tenantId}`.slice(0, 64),
        ExternalId: externalId,
        Tags: [{ Key: "tenantId", Value: tenantId }],
      })
    );
    const credentials = result.Credentials;
    if (!credentials?.AccessKeyId || !credentials.SecretAccessKey || !credentials.SessionToken) {
      throw new Error("STS returned incomplete credentials");
    }
    return {
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,
      expiration: credentials.Expiration,
    };
  }
}

export class CertificateManager {
  constructor(private readonly acm: ACMClient) {}

  async requestDnsValidatedCertificate(domainName: string, alternativeNames: string[] = []): Promise<string> {
    const result = await this.acm.send(
      new RequestCertificateCommand({
        DomainName: domainName,
        SubjectAlternativeNames: alternativeNames,
        ValidationMethod: "DNS",
        IdempotencyToken: domainName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32),
      })
    );
    if (!result.CertificateArn) throw new Error("ACM returned no certificate ARN");
    return result.CertificateArn;
  }
}

export interface AuditEvent {
  tenantId: string;
  actor: string;
  action: string;
  resource: string;
  decision: "allow" | "deny";
  at: string;
}

export function auditEvent(input: Omit<AuditEvent, "at">): AuditEvent {
  return { ...input, at: new Date().toISOString() };
}
