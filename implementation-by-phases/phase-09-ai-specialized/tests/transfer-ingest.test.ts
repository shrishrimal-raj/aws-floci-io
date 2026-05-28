import { describe, expect, it } from "vitest";
import { createTransferUserMapping, parseIncomingDocumentKey, shouldStartTextract } from "../src/index.js";

describe("Transfer Family document ingest", () => {
  it("creates tenant-scoped SFTP home mapping", () => {
    expect(createTransferUserMapping("tenant-a", "alice", "docs", "arn:role")).toMatchObject({
      username: "alice",
      homeDirectory: "/docs/tenants/tenant-a/incoming",
      allowedPrefixes: ["/tenants/tenant-a/incoming/*"],
    });
  });

  it("parses incoming document S3 key", () => {
    expect(parseIncomingDocumentKey("tenants/tenant-a/incoming/invoice.pdf")).toEqual({
      tenantId: "tenant-a",
      key: "tenants/tenant-a/incoming/invoice.pdf",
      source: "sftp",
      contentType: "application/pdf",
    });
  });

  it("starts Textract only for PDFs", () => {
    expect(shouldStartTextract(parseIncomingDocumentKey("tenants/t/incoming/file.pdf"))).toBe(true);
    expect(shouldStartTextract(parseIncomingDocumentKey("tenants/t/incoming/file.txt"))).toBe(false);
  });
});
