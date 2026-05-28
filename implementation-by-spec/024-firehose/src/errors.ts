import { AppError } from "@floci-lab/errors";

export class FirehoseError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`FIREHOSE_${code}`, message, cause);
  }
}
