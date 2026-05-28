export interface ProductDocument {
  tenantId: string;
  productId: string;
  name: string;
  description?: string;
  tags: string[];
  vector?: number[];
}

export function productIndexMapping(): Record<string, unknown> {
  return {
    settings: {
      analysis: {
        analyzer: {
          product_text: { tokenizer: "standard", filter: ["lowercase", "asciifolding"] },
        },
      },
      index: { knn: true },
    },
    mappings: {
      properties: {
        tenantId: { type: "keyword" },
        productId: { type: "keyword" },
        name: { type: "text", analyzer: "product_text", fields: { keyword: { type: "keyword" } } },
        description: { type: "text", analyzer: "product_text" },
        tags: { type: "keyword" },
        vector: { type: "knn_vector", dimension: 3 },
      },
    },
  };
}

export function productSearchQuery(tenantId: string, text: string): Record<string, unknown> {
  return {
    query: {
      bool: {
        filter: [{ term: { tenantId } }],
        must: [
          {
            multi_match: {
              query: text,
              fields: ["name^3", "description", "tags"],
              fuzziness: "AUTO",
            },
          },
        ],
      },
    },
  };
}

export class ProductSearchIndex {
  constructor(private readonly endpoint = process.env.OPENSEARCH_ENDPOINT ?? "http://localhost:9200", private readonly index = "products") {}

  async create(fetcher: typeof fetch = fetch): Promise<void> {
    await fetcher(`${this.endpoint}/${this.index}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(productIndexMapping()) });
  }

  async indexDocument(document: ProductDocument, fetcher: typeof fetch = fetch): Promise<void> {
    await fetcher(`${this.endpoint}/${this.index}/_doc/${document.tenantId}-${document.productId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(document),
    });
  }

  async search(tenantId: string, text: string, fetcher: typeof fetch = fetch): Promise<unknown> {
    const response = await fetcher(`${this.endpoint}/${this.index}/_search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(productSearchQuery(tenantId, text)),
    });
    return response.json();
  }
}
