#!/usr/bin/env tsx
import {
  createTopic,
  deleteTopic,
  fifoEventIds,
  parseTopicEventEnvelope,
  publishFifoJsonEvent,
} from "../use-cases/topics.js";

const topicArn = await createTopic({
  name: `floci-sns-audit-${Date.now()}.fifo`,
  fifo: true,
  contentBasedDeduplication: false,
});

const ids = fifoEventIds(
  "acme-bank",
  "account",
  "account.balance.updated",
  "acct-123",
);

const messageId = await publishFifoJsonEvent(
  topicArn,
  ids.groupId,
  ids.deduplicationId,
  "account.balance.updated",
  { tenantId: "acme-bank", accountId: "acct-123", balanceCents: 502500 },
);

const localEnvelope = parseTopicEventEnvelope<{
  tenantId: string;
  accountId: string;
}>(
  JSON.stringify({
    type: "account.balance.updated",
    payload: { tenantId: "acme-bank", accountId: "acct-123" },
    createdAt: new Date().toISOString(),
  }),
);

console.log({
  useCase:
    "ordered audit/event stream per aggregate before consumers write projections",
  messageId,
  ids,
  parsedType: localEnvelope.type,
});

await deleteTopic(topicArn);
