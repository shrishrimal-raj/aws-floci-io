export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 8,
  baseDelayMs: 500,
  maxDelayMs: 60_000,
  jitterRatio: 0.2,
};

export function computeBackoffMs(attempt: number, policy: RetryPolicy = defaultRetryPolicy, random = Math.random): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = exponential * policy.jitterRatio * random();
  return Math.round(exponential + jitter);
}

export function shouldRetry(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export function isPoisonMessage(attempts: number, policy: RetryPolicy = defaultRetryPolicy): boolean {
  return attempts >= policy.maxAttempts;
}
