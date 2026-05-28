import { AppError } from "@floci-lab/errors";

export class EKSError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EKS_${code}`, message, cause);
  }
}
