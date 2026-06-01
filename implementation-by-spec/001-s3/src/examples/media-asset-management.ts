#!/usr/bin/env tsx
import {
  createBucket,
  putObject,
  getObjectAsString,
  listObjects,
  deleteBucket,
  createPresignedPutUrl,
  createPresignedGetUrl,
  putLifecycleExpirationRule,
  enableVersioning,
  writeAuditLogEntry,
} from "../use-cases/object-storage.js";

/**
 * Media Asset Management Example
 * 
 * Demonstrates an enterprise media workflow where:
 * 1. Raw video files are uploaded to a raw bucket
 * 2. S3 Event Notifications trigger processing workflows (Lambda/MediaConvert)
 * 3. Processed assets are stored in processed buckets
 * 4. Lifecycle rules manage storage costs
 * 5. Audit logs track all asset access for compliance
 * 6. Versioning protects against accidental overwrites
 */

const rawBucket = `floci-media-raw-${Date.now()}`;
const processedBucket = `floci-media-processed-${Date.now()}`;
const auditBucket = `floci-media-audit-${Date.now()}`;
const rawVideoKey = "uploads/raw/sample-video.mp4";
const processedVideoKey = "outputs/processed/sample-video-720p.mp4";
const thumbnailKey = "outputs/thumbnails/sample-video-thumb.jpg";

async function simulateMediaWorkflow() {
  const createdBuckets: string[] = [];

  async function createTrackedBucket(bucket: string): Promise<void> {
    await createBucket(bucket);
    createdBuckets.push(bucket);
  }

  try {
    console.log("🎬 Starting Media Asset Management Workflow...");
    
    // 1. Setup buckets for media workflow
    console.log("\n📦 Setting up S3 buckets for media workflow...");
    await createTrackedBucket(rawBucket);
    await createTrackedBucket(processedBucket);
    await createTrackedBucket(auditBucket);
    
    // 2. Enable versioning to protect against accidental overwrites
    console.log("\n🔄 Enabling versioning on media buckets...");
    await enableVersioning(rawBucket);
    await enableVersioning(processedBucket);
    
    // 3. Set lifecycle rules to optimize costs
    console.log("\n⏳ Setting up lifecycle rules for cost optimization...");
    // Move raw files to Glacier after 30 days, delete after 365 days
    await putLifecycleExpirationRule({
      bucket: rawBucket,
      id: "archive-raw-after-30-days",
      prefix: "uploads/raw/",
      days: 30,
    });
    
    // Delete processed thumbnails after 90 days
    await putLifecycleExpirationRule({
      bucket: processedBucket,
      id: "delete-thumbnails-after-90-days",
      prefix: "outputs/thumbnails/",
      days: 90,
    });
    
    // 4. Simulate raw video upload (in real scenario, this would come from user upload or external system)
    console.log("\n📤 Uploading raw video file...");
    const rawVideoData = await getObjectAsString(
      "floci-lab-fixtures", 
      "sample-videos/sample-video.mp4"
    );
    
    await putObject({
      bucket: rawBucket,
      key: rawVideoKey,
      body: rawVideoData || "SIMULATED_RAW_VIDEO_DATA_FOR_DEMO",
      contentType: "video/mp4",
      metadata: {
        uploadTimestamp: new Date().toISOString(),
        source: "user-upload",
        title: "Sample Marketing Video",
        duration: "120",
        resolution: "1920x1080"
      }
    });
    
    console.log("✅ Raw video uploaded successfully");
    
    // 5. Generate presigned URLs for secure, temporary access
    console.log("\n🔗 Generating presigned URLs for secure access...");
    const uploadUrl = await createPresignedPutUrl(
      rawBucket,
      "uploads/raw/another-video.mp4",
      3600 // 1 hour expiry
    );
    
    const downloadUrl = await createPresignedGetUrl(
      processedBucket,
      processedVideoKey,
      1800 // 30 minute expiry
    );
    
    console.log(`Upload URL (valid for 1h): ${uploadUrl.substring(0, 100)}...`);
    console.log(`Download URL (valid for 30m): ${downloadUrl.substring(0, 100)}...`);
    
    // 6. Simulate processing completion (in real scenario, Lambda/MediaConvert would do this)
    console.log("\n⚙️ Simulating video processing completion...");
    await putObject({
      bucket: processedBucket,
      key: processedVideoKey,
      body: "SIMULATED_PROCESSED_VIDEO_720P_DATA",
      contentType: "video/mp4",
      metadata: {
        sourceVideo: rawVideoKey,
        processingTimestamp: new Date().toISOString(),
        resolution: "1280x720",
        bitrate: "3000k",
        codec: "H.264"
      }
    });
    
    // 7. Generate thumbnail
    console.log("\n🖼️ Generating video thumbnail...");
    await putObject({
      bucket: processedBucket,
      key: thumbnailKey,
      body: "SIMULATED_THUMBNAIL_IMAGE_DATA",
      contentType: "image/jpeg",
      metadata: {
        sourceVideo: rawVideoKey,
        generatedAt: new Date().toISOString(),
        width: "320",
        height: "180"
      }
    });
    
    // 8. Audit logging for compliance
    console.log("\n📝 Writing audit log entries for compliance...");
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-001`,
      timestamp: new Date().toISOString(),
      tenantId: "media-production",
      actorId: "media-uploader-123",
      action: "RawVideoUploaded",
      bucket: rawBucket,
      key: rawVideoKey,
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-001`,
    });
    
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-002`,
      timestamp: new Date().toISOString(),
      tenantId: "media-production",
      actorId: "media-processing-system",
      action: "VideoProcessingCompleted",
      bucket: processedBucket,
      key: processedVideoKey,
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-002`,
    });
    
    // 9. List objects to verify
    console.log("\n📋 Listing objects in buckets...");
    const rawObjects = await listObjects(rawBucket, "uploads/raw/");
    const processedObjects = await listObjects(processedBucket, "outputs/");
    
    console.log(`Raw bucket contains ${rawObjects.length} objects:`);
    rawObjects.forEach(obj => console.log(`  - ${obj.key} (${obj.size} bytes)`));
    
    console.log(`Processed bucket contains ${processedObjects.length} objects:`);
    processedObjects.forEach(obj => console.log(`  - ${obj.key} (${obj.size} bytes)`));
    
    // 10. Demonstrate secure access patterns
    console.log("\n🔐 Demonstrating secure access patterns...");
    const secureDownloadUrl = await createPresignedGetUrl(
      processedBucket,
      processedVideoKey,
      300 // 5 minute expiry for sensitive content
    );
    
    console.log(`Secure download URL (5 min expiry): ${secureDownloadUrl}`);
    
    console.log("\n✅ Media Asset Management Workflow completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Raw bucket: ${rawBucket}`);
    console.log(`  - Processed bucket: ${processedBucket}`);
    console.log(`  - Audit bucket: ${auditBucket}`);
    console.log(`  - Raw video: ${rawVideoKey}`);
    console.log(`  - Processed video: ${processedVideoKey}`);
    console.log(`  - Thumbnail: ${thumbnailKey}`);
    
  } catch (error) {
    console.error("❌ Media workflow failed:", error);
    throw error;
  } finally {
    console.log("\n🧹 Cleaning up media workflow buckets...");
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
  simulateMediaWorkflow()
    .then(() => {
      console.log("\n🎉 Media asset management example completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Media asset management example failed:", error);
      process.exit(1);
    });
}