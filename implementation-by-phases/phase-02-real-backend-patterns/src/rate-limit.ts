export interface TokenBucketState {
  capacity: number;
  tokens: number;
  refillPerSecond: number;
  updatedAtMs: number;
}

export function consumeToken(state: TokenBucketState, nowMs = Date.now()): { allowed: boolean; state: TokenBucketState } {
  const elapsedSeconds = Math.max(0, (nowMs - state.updatedAtMs) / 1000);
  const refilled = Math.min(state.capacity, state.tokens + elapsedSeconds * state.refillPerSecond);
  if (refilled < 1) return { allowed: false, state: { ...state, tokens: refilled, updatedAtMs: nowMs } };
  return { allowed: true, state: { ...state, tokens: refilled - 1, updatedAtMs: nowMs } };
}
