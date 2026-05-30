import { webhookRetentionDecision } from "../enterprise-patterns.js";

/**
 * Real-world compliance pattern: classify webhook audit records for hot store, S3 archive, or deletion.
 */
export function complianceLifecycleExample() {
  const policy = { hotDays: 30, archiveDays: 365 };
  const now = new Date("2026-05-30T00:00:00.000Z");

  return [
    { eventId: "evt-hot", occurredAt: "2026-05-15T00:00:00.000Z" },
    { eventId: "evt-archive", occurredAt: "2026-01-01T00:00:00.000Z" },
    { eventId: "evt-delete", occurredAt: "2024-01-01T00:00:00.000Z" },
  ].map((record) => ({
    ...record,
    decision: webhookRetentionDecision(record.occurredAt, policy, now),
  }));
}
