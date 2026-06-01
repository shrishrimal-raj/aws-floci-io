#!/usr/bin/env tsx
import {
  createQueue,
  deleteQueue,
  getQueueArn,
  buildComplianceRedrivePolicy,
  tagQueue,
  addPermission,
  removePermission,
  listQueueTags,
  createQueueAuditEvent,
  sendJsonMessage,
  processOneMessage,
  parseJsonEnvelope,
} from '../use-cases/queues.js';

// HIPAA-compliant queue for patient data processing
const queueName = \loci-sqs-hipaa-\\;
const dlqName = \${queueName}-dlq\;

// Create DLQ first
const dlqUrl = await createQueue({
  name: dlqName,
  messageRetentionSeconds: 14 * 24 * 60 * 60, // 14 days retention for audit
});

// Get DLQ ARN for redrive policy
const dlqArn = await getQueueArn(dlqUrl);

// Create main queue with KMS encryption and compliance settings
const queueUrl = await createQueue({
  name: queueName,
  messageRetentionSeconds: 4 * 24 * 60 * 60, // 4 days retention for active messages
  receiveWaitTimeSeconds: 20, // Long polling to reduce cost and latency
  visibilityTimeoutSeconds: 300, // 5 minutes to process PHI
  kmsMasterKeyId: 'alias/phi-sqs-key', // KMS key for PHI encryption
});

// Get main queue ARN
const queueArn = await getQueueArn(queueUrl);

// Apply compliance redrive policy
await setQueueAttributes(queueUrl, buildComplianceRedrivePolicy(dlqArn, 3));

// Add compliance tags for cost allocation and audit
await tagQueue(queueUrl, {
  TenantId: 'hospital-acme',
  Environment: 'production',
  DataClassification: 'PHI', // Protected Health Information
  Owner: 'hipaa-compliance-team',
  Regulation: 'HIPAA',
});

// Add least-privilege permission for specific service account
await addPermission(
  queueUrl,
  'phi-processing-service',
  ['123456789012'], // Specific AWS account ID
  ['SendMessage', 'ReceiveMessage', 'DeleteMessage', 'GetQueueAttributes']
);

// Send PHI-related message (encrypted at rest via KMS)
await sendJsonMessage(
  queueUrl,
  'phi.record.accessed',
  {
    patientId: 'PAT-789123',
    accessedBy: 'dr-smith-456',
    purpose: 'treatment',
    timestamp: new Date().toISOString(),
    // Note: Actual PHI would be encrypted client-side or stored in tokenized form
    dataToken: 'tok_phi_encrypted_reference',
  },
  'phi-access-trace-789',
);

// Process message with audit trail
await processOneMessage(queueUrl, async (message) => {
  try {
    const envelope = parseJsonEnvelope(message.body);
    
    // Validate PHI access compliance
    if (!envelope.payload.patientId || !envelope.payload.accessedBy) {
      throw new Error('Missing required PHI access fields');
    }
    
    // Generate immutable audit event
    const auditEvent = createQueueAuditEvent({
      queueUrl,
      messageId: message.id,
      action: 'PHIAccessed',
      outcome: 'SUCCESS',
      traceId: envelope.traceId,
      tenantId: 'hospital-acme',
      reason: Patient \ accessed for \,
    });
    
    console.log('PHI Access Audit Event:', auditEvent);
    console.log('✅ PHI access compliant with HIPAA requirements');
    
    // In real system, this audit event would be sent to:
    // - CloudWatch Logs with retention
    // - S3 bucket with Object Lock
    // - External SIEM system
  } catch (error) {
    console.error('PHI access validation failed:', error);
    
    // Generate failure audit event
    const failureAudit = createQueueAuditEvent({
      queueUrl,
      messageId: message.id,
      action: 'PHIAccessed',
      outcome: 'ERROR',
      traceId: envelope?.traceId,
      tenantId: 'hospital-acme',
      reason: error.message,
    });
    
    console.log('PHI Access Failure Audit:', failureAudit);
    throw error; // Let message go to DLQ after retries
  }
});

// Show compliance metadata
const tags = await listQueueTags(queueUrl);
console.log('');
console.log('Compliance Tags:', tags);
console.log('');
console.log('Queue ARN:', queueArn);
console.log('DLQ ARN:', dlqArn);
console.log('');
console.log('🔒 Compliance Features Demonstrated:');
console.log('  • KMS encryption at rest');
console.log('  • 4-day message retention (active) / 14-day (DLQ)');
console.log('  • Long polling (20s) to reduce costs');
console.log('  • Least-privilege queue permissions');
console.log('  • PHI data classification tagging');
console.log('  • Immutable audit trail with trace IDs');
console.log('  • Structured audit events for SIEM ingestion');

// Cleanup permissions and queues
await removePermission(queueUrl, 'phi-processing-service');
await deleteQueue(queueUrl);
await deleteQueue(dlqUrl);

