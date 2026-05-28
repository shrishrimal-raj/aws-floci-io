import { beforeAll, afterAll } from "vitest";

/**
 * Waits until Floci is healthy. Use in test setup.
 */
export async function waitForFloci(url = "http://localhost:4566", timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/_floci/health`);
      if (res.ok) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Floci not healthy after ${timeoutMs}ms`);
}

export function setupFloci() {
  beforeAll(async () => {
    await waitForFloci();
  });
  afterAll(async () => {
    // hook for per-suite cleanup
  });
}
