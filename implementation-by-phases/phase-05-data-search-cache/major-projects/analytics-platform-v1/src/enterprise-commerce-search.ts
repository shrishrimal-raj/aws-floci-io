import { ProductSearchIndex, assertTenantAccess, retryWithBackoff, withAuditLog, type AuditSink, type ProductDocument, type TenantActor } from "../../../src/index.js";

const auditSink: AuditSink = {
  async write(event) {
    console.log("audit", event.outcome, event.action, event.resource);
  },
};

/**
 * Real-world use case: product search write path for SaaS commerce.
 * Pattern: tenant RBAC -> audit trail -> retry transient OpenSearch failures.
 */
export async function indexCatalogProduct(actor: TenantActor, document: ProductDocument): Promise<void> {
  assertTenantAccess(actor, document.tenantId, "catalog-writer");

  await withAuditLog(
    auditSink,
    { actorId: actor.actorId, tenantId: actor.tenantId, action: "catalog.product.index", resource: document.productId },
    () =>
      retryWithBackoff(() => new ProductSearchIndex("http://localhost:9200", "products").indexDocument(document), {
        retries: 2,
        shouldRetry: (error) => error instanceof TypeError || String(error).includes("429") || String(error).includes("503"),
      })
  );
}

export async function demoEnterpriseCommerceSearch(): Promise<void> {
  await indexCatalogProduct(
    { actorId: "user-123", tenantId: "tenant-a", roles: ["catalog-writer"] },
    { tenantId: "tenant-a", productId: "boot-1", name: "Winter Boot", description: "Waterproof boot", tags: ["winter", "footwear"], vector: [0.1, 0.2, 0.3] }
  ).catch((error) => console.log("demo skipped external OpenSearch call:", error instanceof Error ? error.message : String(error)));
}
