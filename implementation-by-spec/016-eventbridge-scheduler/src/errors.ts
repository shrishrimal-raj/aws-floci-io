import { AppError } from "@floci-lab/errors";

export class EventBridgeSchedulerError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EVENTBRIDGE_SCHEDULER_${code}`, message, cause);
  }
}
