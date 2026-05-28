import { AppError } from "@floci-lab/errors";

export class DynamoDBStreamsError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`DYNAMODB_STREAMS_${code}`, message, cause);
  }
}
