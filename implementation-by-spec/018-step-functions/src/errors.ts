import { AppError } from "@floci-lab/errors";

export class StepFunctionsError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`STEP_FUNCTIONS_${code}`, message, cause);
  }
}
