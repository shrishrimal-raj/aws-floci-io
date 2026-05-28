import { AppError } from "@floci-lab/errors";

export class SESError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`SES_${code}`, message, cause);
  }
}
