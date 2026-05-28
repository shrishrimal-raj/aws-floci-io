import { AppError } from "@floci-lab/errors";

export class MSKKafkaError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`MSK_KAFKA_${code}`, message, cause);
  }
}
