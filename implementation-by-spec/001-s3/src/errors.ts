import { AppError } from "@floci-lab/errors";

export class S3Error extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`S3_${code}`, message, cause);
  }
}
