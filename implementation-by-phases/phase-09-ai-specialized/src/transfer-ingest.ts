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

/**
 * Creates tenant-scoped AWS Transfer Family user mapping.
 * Example: partner `claims-dropbox` lands files only under `/tenants/hospital-a/incoming`.
 */
export function createTransferUserMapping(tenantId: string, username: string, bucket: string, roleArn: string): TransferUserMapping {
  const prefix = `/tenants/${tenantId}/incoming`;
  return {
    username,
    roleArn,
    homeDirectory: `/${bucket}${prefix}`,
    allowedPrefixes: [`${prefix}/*`],
  };
}

/**
 * Parses tenant and content type from incoming S3 object key.
 * Example: `tenants/acme/incoming/invoice.pdf` becomes SFTP PDF ingest event for downstream routing.
 */
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

/**
 * Decides whether document should start Textract flow.
 * Example: PDFs in incoming prefix start OCR; CSV/TXT files route to alternate parser or quarantine.
 */
export function shouldStartTextract(event: IngestedDocumentEvent): boolean {
  return event.contentType === "application/pdf" && event.key.includes("/incoming/");
}
