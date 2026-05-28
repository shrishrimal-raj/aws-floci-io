export interface TransferUserMapping {
  username: string;
  roleArn: string;
  homeDirectory: string;
  allowedPrefixes: string[];
}

export interface IngestedDocumentEvent {
  tenantId: string;
  key: string;
  source: "sftp" | "api";
  contentType: string;
}

export function createTransferUserMapping(tenantId: string, username: string, bucket: string, roleArn: string): TransferUserMapping {
  const prefix = `/tenants/${tenantId}/incoming`;
  return {
    username,
    roleArn,
    homeDirectory: `/${bucket}${prefix}`,
    allowedPrefixes: [`${prefix}/*`],
  };
}

export function parseIncomingDocumentKey(key: string): IngestedDocumentEvent {
  const match = /^tenants\/([^/]+)\/incoming\/(.+)$/.exec(key);
  if (!match) throw new Error(`Invalid incoming document key: ${key}`);
  const fileName = match[2] ?? "";
  return {
    tenantId: match[1] ?? "",
    key,
    source: "sftp",
    contentType: fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
  };
}

export function shouldStartTextract(event: IngestedDocumentEvent): boolean {
  return event.contentType === "application/pdf" && event.key.includes("/incoming/");
}
