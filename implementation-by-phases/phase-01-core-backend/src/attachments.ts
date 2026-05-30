import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";
import type { AttachmentUploadRequest } from "./taskflow-model.js";

export interface PresignedUpload {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

export class AttachmentService {
  constructor(
    private readonly s3: S3Client,
    private readonly bucket = process.env.TASKFLOW_ATTACHMENTS_BUCKET ?? "taskflow-attachments"
  ) {}

  /**
   * Creates tenant-scoped presigned S3 upload target.
   *
   * Example: browser uploads `invoice.pdf` directly to S3 under `tenants/{tenantId}/tasks/{taskId}/...`, keeping API Lambda small and cheap.
   */
  async createUpload(input: AttachmentUploadRequest, expiresIn = 900): Promise<PresignedUpload> {
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `tenants/${input.tenantId}/tasks/${input.taskId}/${crypto.randomUUID()}-${safeName}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.contentType,
      Metadata: { tenantId: input.tenantId, taskId: input.taskId },
    });

    return { key, uploadUrl: await getSignedUrl(this.s3, command, { expiresIn }), expiresIn };
  }
}
