#!/usr/bin/env tsx
import {
  createQueueWithDlq,
  deleteQueue,
  getQueueMetricsSnapshot,
  createQueueAuditEvent,
  listQueueTags,
  tagQueue,
  sendJsonMessage,
  processOneMessage,
  parseJsonEnvelope,
  processMessageBatch,
} from '../use-cases/queues.js';

const name = \loci-sqs-monitoring-\\;
const { queueUrl, deadLetterQueueUrl } = await createQueueWithDlq(name, 3);

// Add tags for cost allocation and observability
await tagQueue(queueUrl, {
  TenantId: 'acme-corp',
  Environment: 'staging',
  CostCenter: 'engineering',
  Owner: 'platform-team',
});

// Send sample messages for monitoring demo
await sendJsonMessage(
  queueUrl,
  'user.signup',
  { userId: 'user-123', email: 'user@example.com' },
  'trace-signup-001',
);

await sendJsonMessage(
  queueUrl,
  'order.created',
  { orderId: 'order-789', amount: 9995 },
  'trace-order-001',
);

// Process messages and generate audit events
const processed: string[] = [];
await processMessageBatch(queueUrl, async (message) => {
  try {
    const envelope = parseJsonEnvelope(message.body);
    processed.push(envelope.type);
    
    // Generate audit event for compliance
    const auditEvent = createQueueAuditEvent({
      queueUrl,
      messageId: message.id,
      action: \Process\\,
      outcome: 'SUCCESS',
      traceId: envelope.traceId,
      tenantId: 'acme-corp',
    });
    
    console.log('Audit event:', auditEvent);
  } catch (error) {
    console.error('Processing failed:', error);
    // Don't delete on failure - will go to DLQ after max receives
  }
});

// Get metrics snapshot for observability
const metrics = await getQueueMetricsSnapshot(queueUrl, {
  backlogWarning: 5,    // Alarm if backlog > 5
  inFlightWarning: 2,   // Alarm if > 2 messages being processed
});

console.log('');
console.log('Queue Metrics Snapshot:', metrics);

// Show tags for cost allocation
const tags = await listQueueTags(queueUrl);
console.log('');
console.log('Queue Tags (for cost allocation):', tags);

// Show alarm hints based on thresholds
if (metrics.alarmHints.length > 0) {
  console.log('');
  console.log('🚨 Alarm Hints:', metrics.alarmHints);
} else {
  console.log('');
  console.log('✅ All metrics within normal thresholds');
}

// Demonstrate what CloudWatch alarms would look like
console.log('');
console.log('📊 Suggested CloudWatch Alarms:');
console.log(\- BacklogHigh: ApproximateNumberOfMessagesVisible > \ for 3 periods\);
console.log(\- InFlightHigh: ApproximateNumberOfMessagesNotVisible > 2 for 3 periods\);
console.log(\- OldestMessage: ApproximateAgeOfOldestMessage > 300 seconds for 2 periods\);

await deleteQueue(queueUrl);
await deleteQueue(deadLetterQueueUrl);

