import { AppError } from "@floci-lab/errors";

/**
 * Normalizes AWS SDK/Step Functions failures under module-specific error codes.
 * Example: `AccessDeniedException` becomes `STEP_FUNCTIONS_AccessDeniedException` for APIs, logs, and tests.
 */
export class StepFunctionsError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`STEP_FUNCTIONS_${code}`, message, cause);
  }
}
