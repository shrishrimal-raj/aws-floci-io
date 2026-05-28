import { AppError } from "@floci-lab/errors";

export class AutoScalingError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`AUTO_SCALING_${code}`, message, cause);
  }
}
