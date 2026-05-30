export interface TokenBucketState {
  capacity: number;
  tokens: number;
  refillPerSecond: number;
  updatedAtMs: number;
}

/**
 * Consumes one token from in-memory token bucket state.
 *
 * Example: per-tenant webhook API checks this before accepting an event; allowed tenants continue, noisy tenants receive HTTP 429.
 */
export function consumeToken(state: TokenBucketState, nowMs = Date.now()): { allowed: boolean; state: TokenBucketState } {
  const elapsedSeconds = Math.max(0, (nowMs - state.updatedAtMs) / 1000);
  const refilled = Math.min(state.capacity, state.tokens + elapsedSeconds * state.refillPerSecond);
  if (refilled < 1) return { allowed: false, state: { ...state, tokens: refilled, updatedAtMs: nowMs } };
  return { allowed: true, state: { ...state, tokens: refilled - 1, updatedAtMs: nowMs } };
}

/**
 * Creates starter rate-limit state for one tenant or endpoint.
 *
 * Example: enterprise plan receives `capacity=100, refillPerSecond=20`; free plan receives `capacity=10, refillPerSecond=1`.
 */
export function createTokenBucket(capacity: number, refillPerSecond: number, nowMs = Date.now()): TokenBucketState {
  return { capacity, tokens: capacity, refillPerSecond, updatedAtMs: nowMs };
}

/**
 * Calculates user-facing wait time after rate-limit denial.
 *
 * Example: return this as `Retry-After` header from API Gateway/Lambda integration.
 */
export function retryAfterSeconds(state: TokenBucketState): number {
  if (state.tokens >= 1) return 0;
  return Math.ceil((1 - state.tokens) / state.refillPerSecond);
}
