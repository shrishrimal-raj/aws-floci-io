#!/usr/bin/env tsx
import {
  createBucket,
  putObject,
  getObjectAsString,
  listObjects,
  deleteBucket,
  putLifecycleExpirationRule,
  putJsonObject,
  getJsonObject,
  writeAuditLogEntry,
  estimateMonthlyStorageCost,
} from "../use-cases/object-storage.js";

/**
 * Data Lake Analytics Example
 * 
 * Demonstrates an enterprise data lake implementation with:
 * 1. Partitioned data layout (year/month/day/hour) for efficient querying
 * 2. Integration with AWS Glue for schema discovery and ETL
 * 3. Lifecycle policies for cost-effective storage tiering
 * 4. Audit tracking for data governance and compliance
 * 5. Cost modeling for capacity planning
 * 6. JSON manifest files for data discovery
 */

const dataLakeBucket = `floci-data-lake-${Date.now()}`;
const auditBucket = `floci-data-lake-audit-${Date.now()}`;
const databaseName = "analytics_db";
const tableName = "user_events";

async function simulateDataLakeWorkflow() {
  const createdBuckets: string[] = [];

  async function createTrackedBucket(bucket: string): Promise<void> {
    await createBucket(bucket);
    createdBuckets.push(bucket);
  }

  try {
    console.log("🏛️ Starting Data Lake Analytics Workflow...");
    
    // 1. Setup buckets
    console.log("\n📦 Setting up data lake and audit buckets...");
    await createTrackedBucket(dataLakeBucket);
    await createTrackedBucket(auditBucket);
    
    // 2. Configure lifecycle policies for cost optimization
    console.log("\n⏳ Configuring lifecycle policies for storage optimization...");
    // Move infrequently accessed data to IA after 30 days
    await putLifecycleExpirationRule({
      bucket: dataLakeBucket,
      id: "move-to-ia-after-30-days",
      prefix: "raw/",
      days: 30,
    });
    
    // Move to Glacier Deep Archive after 365 days for long-term retention
    await putLifecycleExpirationRule({
      bucket: dataLakeBucket,
      id: "archive-to-glacier-after-1-year",
      prefix: "processed/",
      days: 365,
    });
    
    // 3. Ingest raw event data (simulating streaming from applications)
    console.log("\n📥 Ingesting raw event data into data lake...");
    const eventData = [
      { userId: "user123", action: "page_view", page: "/home", timestamp: "2026-05-30T10:00:00Z" },
      { userId: "user456", action: "click", element: "buy-button", timestamp: "2026-05-30T10:01:00Z" },
      { userId: "user123", action: "purchase", amount: 99.99, timestamp: "2026-05-30T10:05:00Z" },
    ];
    
    // Partition data by year/month/day/hour for optimal query performance
    const partitionDate = new Date();
    const year = partitionDate.getFullYear();
    const month = String(partitionDate.getMonth() + 1).padStart(2, '0');
    const day = String(partitionDate.getDate()).padStart(2, '0');
    const hour = String(partitionDate.getHours()).padStart(2, '0');
    
    const rawDataKey = `raw/ingest-year=${year}/month=${month}/day=${day}/hour=${hour}/events-${Date.now()}.json`;
    
    await putJsonObject({
      bucket: dataLakeBucket,
      key: rawDataKey,
      value: {
        ingestTimestamp: new Date().toISOString(),
        recordCount: eventData.length,
        source: "web-application",
        events: eventData
      },
      metadata: {
        dataClassification: "internal",
        retentionPeriod: "365 days",
        pipelineVersion: "1.0"
      }
    });
    
    console.log(`✅ Ingested ${eventData.length} events to ${rawDataKey}`);
    
    // 4. Create processed/refined data (simulating ETL with Glue/Spark)
    console.log("\n⚙️ Creating processed/refined datasets...");
    const processedData = {
      dataset: "user_events_summary",
      timePeriod: `${year}-${month}-${day}`,
      metrics: {
        uniqueUsers: 2,
        totalEvents: 3,
        purchases: 1,
        revenue: 99.99
      },
      processedAt: new Date().toISOString(),
      schemaVersion: "1.0"
    };
    
    const processedKey = `processed/year=${year}/month=${month}/day=${day}/summary.json`;
    
    await putJsonObject({
      bucket: dataLakeBucket,
      key: processedKey,
      value: processedData,
      metadata: {
        dataClassification: "internal",
        retentionPeriod: "365 days",
        processingJob: "daily-summary-etl"
      }
    });
    
    console.log(`✅ Created processed dataset at ${processedKey}`);
    
    // 5. Create data catalog/manifest for discovery
    console.log("\n📋 Creating data manifest for discovery and governance...");
    const manifest = {
      database: databaseName,
      table: tableName,
      description: "User interaction events from web application",
      location: `s3://${dataLakeBucket}/raw/`,
      format: "JSON",
      partitionColumns: ["year", "month", "day", "hour"],
      schema: [
        { name: "userId", type: "string", description: "Unique user identifier" },
        { name: "action", type: "string", description: "User action performed" },
        { name: "page", type: "string", description: "Page where action occurred" },
        { name: "element", type: "string", description: "UI element interacted with" },
        { name: "amount", type: "decimal", description: "Purchase amount (if applicable)" },
        { name: "timestamp", type: "timestamp", description: "Event timestamp" }
      ],
      createdAt: new Date().toISOString(),
      createdBy: "data-platform-team",
      tags: {
        environment: "production",
        domain: "analytics",
        pii: "false"
      }
    };
    
    const manifestKey = `manifests/${databaseName}/${tableName}.json`;
    
    await putJsonObject({
      bucket: dataLakeBucket,
      key: manifestKey,
      value: manifest,
      metadata: {
        manifestVersion: "1.0",
        lastUpdated: new Date().toISOString()
      }
    });
    
    console.log(`✅ Created data manifest at ${manifestKey}`);
    
    // 6. Audit logging for data governance
    console.log("\n📝 Writing audit log entries for data governance...");
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-dl-001`,
      timestamp: new Date().toISOString(),
      tenantId: "analytics-platform",
      actorId: "data-ingestion-service",
      action: "DataIngested",
      bucket: dataLakeBucket,
      key: rawDataKey,
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-dl-001`,
    });
    
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-dl-002`,
      timestamp: new Date().toISOString(),
      tenantId: "analytics-platform",
      actorId: "etl-processing-job",
      action: "DataProcessed",
      bucket: dataLakeBucket,
      key: processedKey,
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-dl-002`,
    });
    
    // 7. Cost estimation for capacity planning
    console.log("\n💰 Estimating monthly storage costs for capacity planning...");
    // Estimate based on current data plus projected growth
    const currentStorageGb = 0.5; // 500MB current
    const projectedStorageGb = 50; // 50GB projected monthly
    
    const costEstimate = estimateMonthlyStorageCost({
      storageGb: projectedStorageGb,
      putRequests: 10000, // 10K PUT requests per month
      getRequests: 50000, // 50K GET requests per month
      storageUsdPerGbMonth: 0.023, // Standard storage
      putUsdPer1k: 0.005, // $0.005 per 1K PUT requests
      getUsdPer1k: 0.0004 // $0.0004 per 1K GET requests
    });
    
    console.log(`📊 Monthly Storage Cost Estimate:`);
    console.log(`  - Storage: $${costEstimate.storageUsd.toFixed(2)}`);
    console.log(`  - PUT Requests: $${costEstimate.putRequestUsd.toFixed(2)}`);
    console.log(`  - GET Requests: $${costEstimate.getRequestUsd.toFixed(2)}`);
    console.log(`  - Total: $${costEstimate.totalUsd.toFixed(2)}`);
    
    // 8. List objects to verify structure
    console.log("\n📋 Verifying data lake structure...");
    const rawObjects = await listObjects(dataLakeBucket, "raw/");
    const processedObjects = await listObjects(dataLakeBucket, "processed/");
    const manifestObjects = await listObjects(dataLakeBucket, "manifests/");
    
    console.log(`Raw data layer: ${rawObjects.length} objects`);
    console.log(`Processed data layer: ${processedObjects.length} objects`);
    console.log(`Manifest layer: ${manifestObjects.length} objects`);
    
    // Show partition structure
    if (rawObjects.length > 0) {
      console.log("\n🔍 Partition structure sample:");
      rawObjects.slice(0, 3).forEach(obj => {
        console.log(`  - ${obj.key}`);
      });
    }
    
    console.log("\n✅ Data Lake Analytics Workflow completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Data Lake Bucket: ${dataLakeBucket}`);
    console.log(`  - Audit Bucket: ${auditBucket}`);
    console.log(`  - Database: ${databaseName}`);
    console.log(`  - Table: ${tableName}`);
    console.log(`  - Raw Data Path: s3://${dataLakeBucket}/raw/`);
    console.log(`  - Processed Data Path: s3://${dataLakeBucket}/processed/`);
    console.log(`  - Manifest Path: s3://${dataLakeBucket}/manifests/`);
    
  } catch (error) {
    console.error("❌ Data lake workflow failed:", error);
    throw error;
  } finally {
    console.log("\n🧹 Cleaning up data lake buckets...");
    const bucketsToDelete = [...createdBuckets].reverse();
    const cleanupResults = await Promise.allSettled(
      bucketsToDelete.map((bucket) => deleteBucket(bucket)),
    );

    cleanupResults.forEach((result, index) => {
      if (result.status === "rejected") {
        const bucket = bucketsToDelete[index];
        console.warn(`⚠️ Failed to delete ${bucket}:`, result.reason);
      }
    });
  }
}

// Run the workflow if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simulateDataLakeWorkflow()
    .then(() => {
      console.log("\n🎉 Data lake analytics example completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Data lake analytics example failed:", error);
      process.exit(1);
    });
}