import { AppError } from "@floci-lab/errors";

export class LambdaError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`LAMBDA_${code}`, message, cause);
  }
}
