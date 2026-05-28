import { AppError } from "@floci-lab/errors";

export class ACMError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ACM_${code}`, message, cause);
  }
}
