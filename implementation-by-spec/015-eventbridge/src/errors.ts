import { AppError } from "@floci-lab/errors";

export class EventBridgeError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EVENTBRIDGE_${code}`, message, cause);
  }
}
