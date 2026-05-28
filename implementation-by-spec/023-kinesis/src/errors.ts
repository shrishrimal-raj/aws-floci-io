import { AppError } from "@floci-lab/errors";

export class KinesisDataStreamsError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`KINESIS_${code}`, message, cause);
  }
}
