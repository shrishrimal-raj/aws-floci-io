import { AppError } from "@floci-lab/errors";

/**
 * Normalizes AWS SDK/EventBridge failures under module-specific error codes.
 * Example: `AccessDeniedException` becomes `EVENTBRIDGE_AccessDeniedException` for API responses and logs.
 */
export class EventBridgeError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EVENTBRIDGE_${code}`, message, cause);
  }
}
