import { AppError } from "@floci-lab/errors";

export class EventBridgePipesError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EVENTBRIDGE_PIPES_${code}`, message, cause);
  }
}
