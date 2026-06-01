#!/usr/bin/env tsx
import {
  createQueue,
  deleteQueue,
  sendMessage,
  sendMessageBatch,
  estimateSqsRequestCost,
  getApproximateQueueCounts,
  receiveMessages,
  deleteMessage,
} from '../use-cases/queues.js';

// Demonstrate SQS cost optimization techniques
const queueName = \loci-sqs-cost-\\;
const queueUrl = await createQueue({
  name: queueName,
  receiveWaitTimeSeconds: 20, // Long polling - reduces empty receives
  messageRetentionSeconds: 4 * 60 * 60, // 4 hours - short-lived messages
});

console.log('🚀 SQS Cost Optimization Demo');
console.log('=' .repeat(50));

// Scenario: Processing 1000 events
const eventCount = 1000;
const batchSize = 10; // Max batch size for SQS

// Method 1: Individual sends (expensive)
console.log(\\n📊 Method 1: Individual Sends (\ requests));
const startTimeIndividual = Date.now();
for (let i = 0; i < eventCount; i++) {
  await sendMessage({
    queueUrl,
    body: JSON.stringify({
      eventId: \evt-\\,
      type: 'metrics.updated',
      timestamp: Date.now(),
      value: Math.random() * 100,
    }),
  });
}
const individualTime = Date.now() - startTimeIndividual;

const individualCost = estimateSqsRequestCost({
  requests: eventCount,
  freeTierRequests: 1_000_000, // AWS free tier
});
console.log(Time: \ms);
console.log(Cost estimate: \$\);
console.log(Billable requests: \);

// Clear queue for next test
await receiveMessages(queueUrl, eventCount, 0); // Pull all messages
for (let i = 0; i < eventCount; i++) {
  const [message] = await receiveMessages(queueUrl, 1, 0);
  if (message?.receiptHandle) {
    await deleteMessage(queueUrl, message.receiptHandle);
  }
}

// Method 2: Batch sends (cost-effective)
console.log(\\n📦 Method 2: Batch Sends (\ requests));
const startTimeBatch = Date.now();
for (let i = 0; i < eventCount; i += batchSize) {
  const batch = [];
  for (let j = 0; j < batchSize && (i + j) < eventCount; j++) {
    batch.push(JSON.stringify({
      eventId: \evt-\\,
      type: 'metrics.updated',
      timestamp: Date.now(),
      value: Math.random() * 100,
    }));
  }
  await sendMessageBatch(queueUrl, batch);
}
const batchTime = Date.now() - startTimeBatch;

const batchCost = estimateSqsRequestCost({
  requests: Math.ceil(eventCount / batchSize),
  freeTierRequests: 1_000_000,
});
console.log(Time: \ms);
console.log(Cost estimate: \$\);
console.log(Billable requests: \);

// Calculate savings
const savingsPercent = ((individualCost.requestUsd - batchCost.requestUsd) / individualCost.requestUsd) * 100;
console.log(\\n💰 Savings with batching: \%);

// Demonstrate long polling benefits
console.log(\\n⏱️  Long Polling Benefits:);
console.log(  • WaitTimeSeconds: 20 (vs default 0));
console.log(  • Reduces empty receive requests by ~90%);
console.log(  • Lower cost per useful message);
console.log(  • Slightly higher latency acceptable for batch workloads);

// Show queue depth during processing
console.log(\\n📈 Queue Depth Monitoring:);
const counts = await getApproximateQueueCounts(queueUrl);
console.log(  Visible messages: \);
console.log(  Not visible (processing): \);
console.log(  Delayed messages: \);

// Cost optimization best practices
console.log(\\n💡 SQS Cost Optimization Best Practices:);
console.log(  1. Batch sends (up to 10 messages/request));
console.log(  2. Long polling (WaitTimeSeconds 10-20s));
console.log(  3. Keep message bodies < 64KB (use S3 pointer for larger payloads));
console.log(  4. Set appropriate retention periods);
console.log(  5. Use FIFO queues only when ordering required);
console.log(  6. Monitor ApproximateNumberOfMessages for scaling);
console.log(  7. Enable ContentBasedDeduplication for FIFO when suitable);

// Cleanup
await deleteQueue(queueUrl);

