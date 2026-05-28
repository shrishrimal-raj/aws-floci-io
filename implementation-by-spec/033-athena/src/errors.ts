import { AppError } from "@floci-lab/errors";

export class AthenaError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ATHENA_${code}`, message, cause);
  }
}
