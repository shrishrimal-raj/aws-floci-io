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

/**
 * Computes capped exponential backoff with jitter.
 *
 * Example: webhook worker retries attempt 5 later than attempt 1, reducing pressure on downstream partner APIs during outages.
 */
export function computeBackoffMs(attempt: number, policy: RetryPolicy = defaultRetryPolicy, random = Math.random): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = exponential * policy.jitterRatio * random();
  return Math.round(exponential + jitter);
}

/**
 * Decides whether HTTP status is safe to retry.
 *
 * Example: retry `429` or `503`; do not retry `400` because payload or endpoint config is likely invalid.
 */
export function shouldRetry(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

/**
 * Classifies exhausted retry attempts as poison messages for DLQ routing.
 *
 * Example: after 8 failed webhook attempts, move delivery to DLQ so operators can inspect it without blocking fresh events.
 */
export function isPoisonMessage(attempts: number, policy: RetryPolicy = defaultRetryPolicy): boolean {
  return attempts >= policy.maxAttempts;
}

/**
 * Builds next retry timestamp for scheduled replay or delayed SQS messages.
 *
 * Example: persist returned ISO string in DynamoDB audit table so support can see when next delivery will run.
 */
export function nextRetryAt(attempt: number, policy: RetryPolicy = defaultRetryPolicy, now = new Date()): string {
  return new Date(now.getTime() + computeBackoffMs(attempt, policy)).toISOString();
}
