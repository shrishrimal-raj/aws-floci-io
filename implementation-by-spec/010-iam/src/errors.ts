import { AppError } from "@floci-lab/errors";

export class IAMError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`IAM_${code}`, message, cause);
  }
}
