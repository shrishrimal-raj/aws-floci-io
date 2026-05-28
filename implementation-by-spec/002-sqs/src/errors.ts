import { AppError } from "@floci-lab/errors";

export class SQSError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`SQS_${code}`, message, cause);
  }
}
