import { AppError } from "@floci-lab/errors";

export class KMSError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`KMS_${code}`, message, cause);
  }
}
