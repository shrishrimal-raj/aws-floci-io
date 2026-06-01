#!/usr/bin/env tsx
import { createBucket, deleteBucket, getJsonObject, listObjects, putJsonObject, writeAuditLogEntry, type AuditLogEntry } from "../use-cases/object-storage.js";
import {
  buildComplianceRedrivePolicy,
  createQueueAuditEvent,
  createQueueWithDlq,
  deleteQueue,
  estimateSqsRequestCost,
  messageIdempotencyKey,
  planAlarms as planSqsAlarms,
  sendJsonMessage,
  type QueuePair,
} from "../../../002-sqs/src/use-cases/queues.js";
import { createTopic, createTopicAuditEvent, deleteTopic, estimateSnsPublishCost, planSnsAlarms, publishJsonEvent, topicMessageAttributes, validateTenantFilterPolicy } from "../../../003-sns/src/use-cases/topics.js";
import { auditEntity, createSingleTable, deleteTable, estimateDynamoDbCost, putJsonEntity, statusIndexKeys } from "../../../004-dynamodb/src/use-cases/table.js";
import { createLambdaAuditEvent, estimateLambdaCost, planLambdaAlarms, redactSensitiveEnv, serviceFunctionSpec } from "../../../006-lambda/src/use-cases/functions.js";
import { leastPrivilegePolicy, multiStatementPolicy, validatePolicyDocument } from "../../../010-iam/src/use-cases/access.js";
import { kmsComplianceFindings, tenantEncryptionContext } from "../../../012-kms/src/use-cases/enterprise.js";
import { redactSecretDeep, secretAuditEvent, secretLifecycleDecision } from "../../../013-secrets-manager/src/use-cases/secrets.js";
import { auditEvent as eventBridgeAuditEvent, enterpriseEvent, estimatePutEventsCost, eventBridgeObservabilityPlan, tenantEventPattern } from "../../../015-eventbridge/src/use-cases/enterprise.js";
import { estimateStandardWorkflowCost, workflowAuditRecord, workflowComplianceControls, workflowInput } from "../../../018-step-functions/src/use-cases/enterprise.js";
import { buildLogAuditEntry, enterpriseApplicationLog, logCostOptimizationPlan, logDisasterRecoveryPlan, logGroupReadPolicy, logLifecyclePlan, metricFilterPlan } from "../../../019-cloudwatch-logs/src/use-cases/enterprise-patterns.js";
import { appLogGroupName } from "../../../019-cloudwatch-logs/src/use-cases/logs.js";
import { emfMetric } from "../../../020-cloudwatch-metrics/src/use-cases/metrics.js";
import { indexMapping } from "../../../032-opensearch/src/use-cases/domains.js";
import { createExternalTableSql } from "../../../033-athena/src/use-cases/queries.js";
import { s3TableLocation } from "../../../034-glue/src/use-cases/catalog.js";
import { requiredTagsRule } from "../../../048-aws-config/src/use-cases/compliance.js";
import { standardTags } from "../../../051-resource-groups-tagging-api/src/use-cases/tags.js";

/**
 * Audit Logging + Compliance Workflow
 *
 * Inspected implemented service folders and selected only services that are useful
 * for sensitive S3 object access:
 * - S3: stores regulated document and immutable audit evidence.
 * - SQS: queues audit-processing work with DLQ/redrive controls.
 * - SNS: publishes compliance notification event for downstream subscribers.
 * - DynamoDB: stores idempotency/job status and audit ledger entity.
 * - Lambda: documents worker runtime contract and audit envelope.
 * - IAM/KMS/Secrets Manager: models security controls without leaking secrets.
 * - EventBridge/Step Functions: models enterprise event and approval workflow.
 * - CloudWatch Logs/Metrics: emits structured log/metric payloads for dashboards.
 * - Glue/Athena/OpenSearch: describes query/search layer over S3 audit data.
 * - AWS Config/Tagging: documents compliance tags and required-tag rule.
 *
 * Not used: unrelated compute/networking/deployment services from the 51 folders.
 */

type ContractDocument = {
  contractId: string;
  tenantId: string;
  ownerUserId: string;
  status: "approved";
  classification: "confidential";
};

type ObjectReadyEvent = {
  tenantId: string;
  documentKey: string;
  auditKey: string;
  requestId: string;
  complianceFramework: "SOC2";
};

const dataBucket = `floci-s3-compliance-data-${Date.now()}`;
const auditBucket = `floci-s3-compliance-audit-${Date.now()}`;
const tableName = `floci-s3-compliance-ledger-${Date.now()}`;
const queueName = `floci-s3-compliance-work-${Date.now()}`;
const topicName = `floci-s3-compliance-events-${Date.now()}`;

const tenantId = "acme-bank";
const actorId = "user-123";
const requestId = `req-${Date.now()}`;
const documentKey = `tenants/${tenantId}/users/${actorId}/contracts/msa.json`;
const auditPrefix = `audit/tenant=${tenantId}/`;

let queuePair: QueuePair | undefined;
let topicArn: string | undefined;
let tableCreated = false;

function artifactKey(name: string): string {
  return `compliance-artifacts/${requestId}/${name}.json`;
}

async function storeArtifact(name: string, value: unknown): Promise<void> {
  await putJsonObject({
    bucket: auditBucket,
    key: artifactKey(name),
    value,
    metadata: { tenantId, requestId, artifact: name },
  });
}

try {
  await createBucket(dataBucket);
  await createBucket(auditBucket);

  // SQS is selected because compliance audit processing needs buffering, retries, and DLQ evidence.
  queuePair = await createQueueWithDlq(queueName, 3);

  // SNS is selected because security/compliance notifications commonly fan out to email/SIEM/chat subscribers.
  topicArn = await createTopic({ name: topicName });

  // DynamoDB is selected because idempotency and audit-ledger lookup need fast keyed access.
  await createSingleTable(tableName);
  tableCreated = true;

  const document: ContractDocument = {
    contractId: "msa-001",
    tenantId,
    ownerUserId: actorId,
    status: "approved",
    classification: "confidential",
  };

  await putJsonObject({
    bucket: dataBucket,
    key: documentKey,
    value: document,
    metadata: { tenantId, classification: "confidential", requestId },
  });

  const auditEntry: AuditLogEntry = {
    eventId: `evt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenantId,
    actorId,
    action: "ContractDownloaded",
    bucket: dataBucket,
    key: documentKey,
    outcome: "ALLOW",
    requestId,
  };

  await writeAuditLogEntry(auditBucket, auditEntry);
  const auditKey = `${auditPrefix}${auditEntry.timestamp.slice(0, 10)}/${auditEntry.eventId}.json`;

  const objectReady: ObjectReadyEvent = {
    tenantId,
    documentKey,
    auditKey,
    requestId,
    complianceFramework: "SOC2",
  };

  const idempotencyKey = messageIdempotencyKey("s3.audit.object-ready", tenantId, auditEntry.eventId);
  const queueMessageId = await sendJsonMessage(queuePair.queueUrl, "s3.audit.object-ready", objectReady, requestId);
  const snsMessageId = await publishJsonEvent(topicArn, "s3.audit.object-ready", objectReady, requestId);

  const ledgerItem = auditEntity({
    tenantId,
    actorId,
    action: auditEntry.action,
    resourceId: documentKey,
    outcome: auditEntry.outcome,
    traceId: requestId,
  });

  await putJsonEntity(
    {
      ...ledgerItem,
      value: {
        ...ledgerItem.value,
        auditEventId: auditEntry.eventId,
        idempotencyKey,
        queueMessageId,
        snsMessageId,
        status: "QUEUED_FOR_REVIEW",
      },
      ...statusIndexKeys(tenantId, "AuditEvent", "QUEUED_FOR_REVIEW", auditEntry.timestamp),
    },
    tableName,
  );

  const eventActor = { tenantId, principalId: actorId, roles: ["publisher", "auditor"], requestId };
  const eventBusName = "enterprise-compliance-bus";
  const appName = "s3-compliance-audit";
  const logGroupName = appLogGroupName(appName, "prod");
  const queueArn = queuePair.deadLetterQueueArn.replace(/-dlq$/, "");
  const s3ObjectArn = `arn:aws:s3:::${dataBucket}/${documentKey}`;
  const auditBucketArn = `arn:aws:s3:::${auditBucket}/${auditPrefix}*`;
  const auditTableLocation = s3TableLocation(auditBucket, auditPrefix);

  const controls = {
    // IAM is selected to teach least-privilege access for confidential S3 objects and audit evidence.
    iam: {
      workerPolicy: leastPrivilegePolicy({
        service: "s3",
        actions: ["GetObject", "PutObject"],
        resourceArn: auditBucketArn,
        tenantId,
      }),
      combinedPolicyFindings: validatePolicyDocument(
        multiStatementPolicy([
          { actions: ["s3:GetObject"], resources: [s3ObjectArn] },
          { actions: ["s3:PutObject"], resources: [auditBucketArn] },
          { actions: ["sqs:SendMessage"], resources: [queueArn] },
        ]),
      ),
    },

    // KMS is selected because audit evidence must be bound to tenant/workload encryption context.
    kms: {
      encryptionContext: tenantEncryptionContext({
        tenantId,
        workload: appName,
        purpose: "audit-evidence",
        dataClass: "confidential",
      }),
      complianceFindings: kmsComplianceFindings({
        aliasName: "alias/s3-compliance-audit",
        rotationEnabled: true,
        encryptionContextKeys: ["tenantId", "workload", "purpose", "dataClass"],
        tags: standardTags(appName, "prod"),
        deletionWindowDays: 30,
      }),
    },

    // Secrets Manager is selected to show safe diagnostics around downstream SIEM/webhook credentials.
    secretsManager: {
      redactedWebhook: redactSecretDeep({ endpoint: "https://siem.example.test", token: "super-secret-token" }),
      audit: secretAuditEvent({ secretId: "prod/acme-bank/siem-webhook", actor: actorId, action: "read", outcome: "success" }),
      lifecycle: secretLifecycleDecision({ lastChangedDate: new Date(Date.now() - 85 * 86_400_000), lastAccessedDate: new Date(), deletedDate: undefined }, { rotateAfterDays: 90, deleteIfUnusedAfterDays: 365 }),
    },

    // EventBridge is selected for enterprise event contracts even though SNS/SQS do local delivery in this example.
    eventBridge: {
      objectReadyEvent: enterpriseEvent({
        eventBusName,
        source: "com.floci.s3.compliance",
        detailType: "S3AuditObjectReady",
        tenantId,
        producer: appName,
        eventId: auditEntry.eventId,
        correlationId: requestId,
        detail: objectReady,
      }),
      auditEvent: eventBridgeAuditEvent(eventActor, eventBusName, auditEntry.action, documentKey, "success"),
      tenantPattern: tenantEventPattern("com.floci.s3.compliance", "S3AuditObjectReady", tenantId),
      observability: eventBridgeObservabilityPlan(appName),
      cost: estimatePutEventsCost(2_000_000),
    },

    // Lambda is selected because SQS messages are normally consumed by stateless audit workers.
    lambda: {
      workerSpec: serviceFunctionSpec("s3-compliance-audit-worker", {
        AUDIT_TABLE: tableName,
        AUDIT_BUCKET: auditBucket,
        QUEUE_URL: queuePair.queueUrl,
      }),
      audit: createLambdaAuditEvent({ functionName: "s3-compliance-audit-worker", action: "ProcessAuditEvent", outcome: "SUCCESS", traceId: requestId, tenantId }),
      safeEnvironment: redactSensitiveEnv({ AUDIT_BUCKET: auditBucket, SIEM_TOKEN: "super-secret-token" }),
      alarms: planLambdaAlarms("s3-compliance-audit-worker", { errorWarning: 1, throttleWarning: 1, durationWarningMs: 2_000 }),
      cost: estimateLambdaCost({ requests: 2_000_000, durationMs: 250, memoryMb: 512 }),
    },

    // Step Functions is selected for regulated manual approval/remediation flows.
    stepFunctions: {
      input: workflowInput({ tenantId, workflowName: "s3-compliance-review", payload: objectReady, correlationId: requestId, idempotencyKey }),
      audit: workflowAuditRecord(eventActor, "s3-compliance-review", "StartExecution", "started", requestId),
      controls: workflowComplianceControls("SOC2"),
      cost: estimateStandardWorkflowCost(250_000, 6),
    },

    // CloudWatch Logs/Metrics are selected for audit visibility without reading raw S3 evidence each time.
    cloudWatch: {
      log: enterpriseApplicationLog("INFO", "s3 audit object queued", { tenantId, requestId, auditEventId: auditEntry.eventId, authorization: "Bearer secret" }),
      logAudit: buildLogAuditEntry({ eventId: auditEntry.eventId, actor: actorId, logGroupName, action: "PutLogEvents", outcome: "ALLOW", metadata: { tenantId, requestId } }),
      readPolicy: logGroupReadPolicy(logGroupName, "us-east-1", "123456789012", "arn:aws:iam::123456789012:role/compliance-auditor"),
      lifecycle: logLifecyclePlan(appName, "prod", true),
      costPlan: logCostOptimizationPlan(logGroupName, 3, 365),
      drPlan: logDisasterRecoveryPlan(appName, "prod", "us-west-2"),
      metricFilter: metricFilterPlan({ logGroupName, filterName: "DeniedObjectAccess", filterPattern: "{ $.outcome = DENY }", metricNamespace: "S3Compliance", metricName: "DeniedObjectAccess", metricValue: "1", alarmThreshold: 1 }),
      emf: emfMetric("S3Compliance", { AuditEventsWritten: 1, AuditMessagesQueued: 1 }, { tenantId, classification: "confidential" }),
    },

    // Glue/Athena/OpenSearch are selected because auditors need query/search over S3 audit evidence.
    analytics: {
      glueTableLocation: auditTableLocation,
      athenaDdl: createExternalTableSql("s3_audit_events", auditTableLocation),
      openSearchMapping: indexMapping({ tenantId: "keyword", actorId: "keyword", action: "keyword", outcome: "keyword", timestamp: "date" }),
    },

    // SNS/SQS/DynamoDB operational controls are selected because these resources are created in this workflow.
    messagingAndState: {
      snsAttributes: topicMessageAttributes({ eventType: "s3.audit.object-ready", tenantId, traceId: requestId }),
      snsAudit: createTopicAuditEvent({ topicArn, action: "PublishAuditEvent", outcome: "PUBLISHED", traceId: requestId, tenantId }),
      snsFilterPolicyValid: validateTenantFilterPolicy({ tenantId: [tenantId], eventType: ["s3.audit.object-ready"] }, tenantId),
      snsAlarms: planSnsAlarms(topicName, { publishFailureWarning: 1, notificationFailureWarning: 1 }),
      snsCost: estimateSnsPublishCost({ publishes: 1_000_000 }),
      sqsAudit: createQueueAuditEvent({ queueUrl: queuePair.queueUrl, messageId: queueMessageId, action: "SendAuditWork", outcome: "SUCCESS", traceId: requestId, tenantId }),
      sqsRedrivePolicy: buildComplianceRedrivePolicy(queuePair.deadLetterQueueArn, 3),
      sqsAlarms: planSqsAlarms(queueName, 100, 1),
      sqsCost: estimateSqsRequestCost({ requests: 2_000_000 }),
      dynamoDbCost: estimateDynamoDbCost({ readRequestUnits: 2_000_000, writeRequestUnits: 1_000_000, storageGb: 5 }),
    },

    // AWS Config/Tagging are selected to show governance around all compliance resources.
    governance: {
      requiredTagsRule: requiredTagsRule(["Service", "Environment"]),
      standardTags: standardTags(appName, "prod"),
    },
  };

  await storeArtifact("security-controls", controls);

  console.log({
    document: await getJsonObject<ContractDocument>(dataBucket, documentKey),
    auditEvent: auditEntry,
    delivery: { queueMessageId, snsMessageId, idempotencyKey },
    selectedServices: [
      "001-s3",
      "002-sqs",
      "003-sns",
      "004-dynamodb",
      "006-lambda",
      "010-iam",
      "012-kms",
      "013-secrets-manager",
      "015-eventbridge",
      "018-step-functions",
      "019-cloudwatch-logs",
      "020-cloudwatch-metrics",
      "032-opensearch",
      "033-athena",
      "034-glue",
      "048-aws-config",
      "051-resource-groups-tagging-api",
    ],
    control: "sensitive object access writes S3 audit evidence, queues processing, publishes notification, stores ledger state, and emits compliance artifacts",
    auditObjects: await listObjects(auditBucket, auditPrefix),
    artifactObjects: await listObjects(auditBucket, `compliance-artifacts/${requestId}/`),
  });
} finally {
  if (topicArn) await deleteTopic(topicArn);
  if (queuePair) {
    await deleteQueue(queuePair.queueUrl);
    await deleteQueue(queuePair.deadLetterQueueUrl);
  }
  if (tableCreated) await deleteTable(tableName);
  await deleteBucket(dataBucket);
  await deleteBucket(auditBucket);
}
