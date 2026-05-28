import { describe, expect, it } from "vitest";
import { ProductSearchIndex, productIndexMapping, productSearchQuery } from "../src/opensearch.js";

describe("OpenSearch product search", () => {
  it("defines typo-tolerant text and vector mapping", () => {
    const mapping = productIndexMapping();
    expect(JSON.stringify(mapping)).toContain("knn_vector");
    expect(JSON.stringify(mapping)).toContain("product_text");
  });

  it("filters search by tenant", () => {
    expect(productSearchQuery("tenant-a", "winter boot")).toMatchObject({
      query: { bool: { filter: [{ term: { tenantId: "tenant-a" } }] } },
    });
  });

  it("indexes product documents through HTTP", async () => {
    const calls: string[] = [];
    const fetcher = async (url: string | URL | Request) => { calls.push(String(url)); return new Response(JSON.stringify({ ok: true })); };
    await new ProductSearchIndex("http://search", "products").indexDocument({ tenantId: "t", productId: "p", name: "Hat", tags: [] }, fetcher as typeof fetch);
    expect(calls[0]).toBe("http://search/products/_doc/t-p");
  });
});
