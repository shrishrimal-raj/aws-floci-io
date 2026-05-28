import { AppError } from "@floci-lab/errors";

export class AWSConfigError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`AWS_CONFIG_${code}`, message, cause);
  }
}
