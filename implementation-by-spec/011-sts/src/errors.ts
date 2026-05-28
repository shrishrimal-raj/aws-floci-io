import { AppError } from "@floci-lab/errors";

export class STSError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`STS_${code}`, message, cause);
  }
}
