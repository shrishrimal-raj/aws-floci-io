#!/usr/bin/env tsx
import {
  createBucket,
  putObject,
  getObjectAsString,
  listObjects,
  deleteBucket,
  putLifecycleExpirationRule,
  enableVersioning,
  putJsonObject,
  getJsonObject,
  createPresignedPutUrl,
  createPresignedGetUrl,
  writeAuditLogEntry,
  writeBackupManifest,
  tenantObjectKey,
  createSecureBrowserUploadSession,
} from "../use-cases/object-storage.js";

/**
 * Secure Document Repository Example
 * 
 * Demonstrates an enterprise document management system with:
 * 1. Document classification and access control
 * 2. Secure upload/download with presigned URLs
 * 3. Retention policies based on document type and regulations
 * 4. Audit trails for compliance (SOX, GDPR, HIPAA, etc.)
 * 5. Version control for document lifecycle management
 * 6. Encryption-at-rest considerations (via bucket policies)
 * 7. Backup and disaster recovery procedures
 * 8. Multi-tenant isolation using key prefixes
 */

const documentsBucket = `floci-documents-${Date.now()}`;
const auditBucket = `floci-documents-audit-${Date.now()}`;
const backupBucket = `floci-documents-backup-${Date.now()}`;

async function simulateDocumentRepository() {
  const createdBuckets: string[] = [];

  async function createTrackedBucket(bucket: string): Promise<void> {
    await createBucket(bucket);
    createdBuckets.push(bucket);
  }

  try {
    console.log("📁 Starting Secure Document Repository Workflow...");
    
    // 1. Setup buckets
    console.log("\n📦 Setting up document storage, audit, and backup buckets...");
    await createTrackedBucket(documentsBucket);
    await createTrackedBucket(auditBucket);
    await createTrackedBucket(backupBucket);
    
    // 2. Enable versioning for document lifecycle management
    console.log("\n🔄 Enabling versioning for document control...");
    await enableVersioning(documentsBucket);
    await enableVersioning(auditBucket);
    
    // 3. Configure retention policies based on document types
    console.log("\n⏳ Configuring retention policies for compliance...");
    // Temporary documents - delete after 30 days
    await putLifecycleExpirationRule({
      bucket: documentsBucket,
      id: "delete-temp-after-30-days",
      prefix: "temp/",
      days: 30,
    });
    
    // Draft documents - delete after 1 year
    await putLifecycleExpirationRule({
      bucket: documentsBucket,
      id: "delete-drafts-after-1-year",
      prefix: "drafts/",
      days: 365,
    });
    
    // Contracts - retain for 7 years (common legal requirement)
    await putLifecycleExpirationRule({
      bucket: documentsBucket,
      id: "retain-contracts-7-years",
      prefix: "legal/contracts/",
      days: 2555, // 7 years
    });
    
    // Financial records - retain for 10 years (SOX compliance)
    await putLifecycleExpirationRule({
      bucket: documentsBucket,
      id: "retain-financial-10-years",
      prefix: "finance/",
      days: 3650, // 10 years
    });
    
    // 4. Simulate multi-tenant document uploads
    console.log("\n👥 Simulating multi-tenant document uploads...");
    
    // Tenant 1: Acme Corporation
    const acmeTenantId = "acme-corp";
    const acmeUserId = "john.doe@acme.com";
    
    // Upload a contract for Acme
    console.log("\n📄 Uploading contract for Acme Corporation...");
    await putObject({
      bucket: documentsBucket,
      key: tenantObjectKey({
        tenantId: acmeTenantId,
        userId: acmeUserId,
        category: "legal",
        fileName: "services-agreement.pdf"
      }),
      body: "SIMULATED_PDF_CONTENT_FOR_ACME_SERVICES_AGREEMENT",
      contentType: "application/pdf",
      metadata: {
        documentType: "contract",
        classification: "confidential",
        department: "legal",
        retentionPeriod: "7 years",
        uploadDate: new Date().toISOString(),
        uploadedBy: acmeUserId
      }
    });
    
    // Upload financial report for Acme
    console.log("\n📊 Uploading financial report for Acme Corporation...");
    await putJsonObject({
      bucket: documentsBucket,
      key: tenantObjectKey({
        tenantId: acmeTenantId,
        userId: acmeUserId,
        category: "finance",
        fileName: "q1-2026-report.json"
      }),
      value: {
        quarter: "Q1 2026",
        revenue: 5000000,
        expenses: 3500000,
        netIncome: 1500000,
        currency: "USD"
      },
      metadata: {
        documentType: "financial-report",
        classification: "restricted",
        department: "finance",
        retentionPeriod: "10 years",
        uploadDate: new Date().toISOString(),
        uploadedBy: acmeUserId
      }
    });
    
    // Tenant 2: Beta Industries
    const betaTenantId = "beta-industries";
    const betaUserId = "jane.smith@beta.com";
    
    // Upload HR policy for Beta
    console.log("\n📋 Uploading HR policy for Beta Industries...");
    await putObject({
      bucket: documentsBucket,
      key: tenantObjectKey({
        tenantId: betaTenantId,
        userId: betaUserId,
        category: "hr",
        fileName: "employee-handbook.pdf"
      }),
      body: "SIMULATED_PDF_CONTENT_FOR_BETA_EMPLOYEE_HANDBOOK",
      contentType: "application/pdf",
      metadata: {
        documentType: "policy",
        classification: "internal",
        department: "hr",
        retentionPeriod: "3 years",
        uploadDate: new Date().toISOString(),
        uploadedBy: betaUserId
      }
    });
    
    // 5. Demonstrate secure browser upload sessions
    console.log("\n🔐 Creating secure browser upload sessions...");
    const uploadSession = await createSecureBrowserUploadSession({
      bucket: documentsBucket,
      tenantId: "gamma-llc",
      userId: "hr-manager@gamma.com",
      category: "hr",
      fileName: "new-hire-package.zip",
      contentType: "application/zip",
      maxBytes: 50 * 1024 * 1024, // 50 MB limit
      expiresInSeconds: 3600, // 1 hour
      metadata: {
        documentType: "onboarding-package",
        classification: "confidential",
        department: "hr"
      }
    });
    
    console.log(`✅ Secure upload session created for Gamma LLC:`);
    console.log(`  - Key: ${uploadSession.key}`);
    console.log(`  - Max Size: ${(uploadSession.maxBytes / (1024*1024)).toFixed(0)} MB`);
    console.log(`  - Expires In: ${uploadSession.expiresInSeconds} seconds`);
    console.log(`  - Required Content-Type: ${uploadSession.requiredHeaders['content-type']}`);
    
    // 6. Generate presigned URLs for secure document access
    console.log("\n🔗 Generating secure presigned URLs for document access...");
    const contractKey = tenantObjectKey({
      tenantId: acmeTenantId,
      userId: acmeUserId,
      category: "legal",
      fileName: "services-agreement.pdf"
    });
    
    // URL for internal employee (shorter expiry)
    const internalViewUrl = await createPresignedGetUrl(
      documentsBucket,
      contractKey,
      900 // 15 minutes for internal access
    );
    
    // URL for external partner (with additional restrictions)
    const externalViewUrl = await createPresignedGetUrl(
      documentsBucket,
      contractKey,
      3600 // 1 hour for external partners
    );
    
    console.log(`Internal view URL (15 min): ${internalViewUrl.substring(0, 80)}...`);
    console.log(`External partner URL (1 hour): ${externalViewUrl.substring(0, 80)}...`);
    
    // 7. Audit logging for compliance tracking
    console.log("\n📝 Writing comprehensive audit log entries...");
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-doc-001`,
      timestamp: new Date().toISOString(),
      tenantId: acmeTenantId,
      actorId: acmeUserId,
      action: "ContractUploaded",
      bucket: documentsBucket,
      key: contractKey,
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-doc-001`,
      // Additional compliance fields
    });
    
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-doc-002`,
      timestamp: new Date().toISOString(),
      tenantId: acmeTenantId,
      actorId: "external-partner-xyz",
      action: "ContractViewed",
      bucket: documentsBucket,
      key: contractKey,
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-doc-002`,
    });
    
    await writeAuditLogEntry(auditBucket, {
      eventId: `evt-${Date.now()}-doc-003`,
      timestamp: new Date().toISOString(),
      tenantId: betaTenantId,
      actorId: betaUserId,
      action: "HRPolicyDownloaded",
      bucket: documentsBucket,
      key: tenantObjectKey({
        tenantId: betaTenantId,
        userId: betaUserId,
        category: "hr",
        fileName: "employee-handbook.pdf"
      }),
      outcome: "ALLOW",
      requestId: `req-${Date.now()}-doc-003`,
    });
    
    // 8. Create backup manifest for disaster recovery
    console.log("\n💾 Creating backup manifest for disaster recovery...");
    const backupPrefix = `tenants/${acmeTenantId}/`;
    const manifest = await writeBackupManifest(
      documentsBucket,
      backupPrefix // Backup Acme tenant documents for this example
    );

    await putJsonObject({
      bucket: backupBucket,
      key: `backup-manifests/${Date.now()}.json`,
      value: manifest,
      metadata: {
        sourceBucket: documentsBucket,
        prefix: backupPrefix,
      },
    });
    
    console.log(`✅ Backup manifest created:`);
    console.log(`  - Generated at: ${manifest.generatedAt}`);
    console.log(`  - Source bucket: ${manifest.sourceBucket}`);
    console.log(`  - Prefix: ${manifest.prefix}`);
    console.log(`  - Object count: ${manifest.objectCount}`);
    console.log(`  - Total size: ${manifest.totalBytes} bytes`);
    
    // Verify backup manifest was stored
    const backupManifests = await listObjects(backupBucket, "backup-manifests/");
    console.log(`  - Backup manifests stored: ${backupManifests.length}`);
    
    // 9. List documents to verify multi-tenancy
    console.log("\n📋 Listing documents to verify isolation...");
    const acmeDocs = await listObjects(
      documentsBucket, 
      `tenants/${acmeTenantId}/`
    );
    const betaDocs = await listObjects(
      documentsBucket, 
      `tenants/${betaTenantId}/`
    );
    const gammaDocs = await listObjects(
      documentsBucket, 
      `tenants/gamma-llc/` // This will be empty as we only created session
    );
    
    console.log(`Acme Corporation documents: ${acmeDocs.length}`);
    acmeDocs.forEach(doc => {
      console.log(`  - ${doc.key} (${doc.size} bytes)`);
    });
    
    console.log(`Beta Industries documents: ${betaDocs.length}`);
    betaDocs.forEach(doc => {
      console.log(`  - ${doc.key} (${doc.size} bytes)`);
    });
    
    console.log(`Gamma LLC documents: ${gammaDocs.length} (upload session only)`);
    
    // 10. Demonstrate document versioning
    console.log("\n🔄 Demonstrating document versioning...");
    // Upload a new version of the contract
    await putObject({
      bucket: documentsBucket,
      key: contractKey,
      body: "SIMULATED_PDF_CONTENT_FOR_ACME_SERVICES_AGREEMENT_V2",
      contentType: "application/pdf",
      metadata: {
        documentType: "contract",
        classification: "confidential",
        department: "legal",
        retentionPeriod: "7 years",
        uploadDate: new Date().toISOString(),
        uploadedBy: acmeUserId,
        version: "2.0",
        changes: "Updated pricing terms and SLA sections"
      }
    });
    
    console.log("✅ New version of contract uploaded (versioning enabled)");
    
    console.log("\n✅ Secure Document Repository Workflow completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  - Documents Bucket: ${documentsBucket}`);
    console.log(`  - Audit Bucket: ${auditBucket}`);
    console.log(`  - Backup Bucket: ${backupBucket}`);
    console.log(`  - Tenants Configured: ${acmeTenantId}, ${betaTenantId}, gamma-llc`);
    console.log(`  - Document Types: Contracts, Financial Reports, Policies, Handbooks`);
    console.log(`  - Classification Levels: Public, Internal, Confidential, Restricted`);
    console.log(`  - Retention Policies: 30 days to 10 years based on document type`);
    console.log(`  - Security Features: Versioning, Audit Logging, Presigned URLs, Metadata Tagging`);
    
  } catch (error) {
    console.error("❌ Document repository workflow failed:", error);
    throw error;
  } finally {
    console.log("\n🧹 Cleaning up document repository buckets...");
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
  simulateDocumentRepository()
    .then(() => {
      console.log("\n🎉 Secure document repository example completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Secure document repository example failed:", error);
      process.exit(1);
    });
}