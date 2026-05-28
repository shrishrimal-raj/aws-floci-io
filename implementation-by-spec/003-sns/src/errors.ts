import { AppError } from "@floci-lab/errors";

export class SNSError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`SNS_${code}`, message, cause);
  }
}
