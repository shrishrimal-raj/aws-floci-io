import { AppError } from "@floci-lab/errors";

export class AWSBackupError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`BACKUP_${code}`, message, cause);
  }
}
