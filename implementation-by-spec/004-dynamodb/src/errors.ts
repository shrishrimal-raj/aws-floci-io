import { AppError } from "@floci-lab/errors";

export class DynamoDBError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`DYNAMODB_${code}`, message, cause);
  }
}
