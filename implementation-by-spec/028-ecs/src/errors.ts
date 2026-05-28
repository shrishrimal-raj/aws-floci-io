import { AppError } from "@floci-lab/errors";

export class ECSError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ECS_${code}`, message, cause);
  }
}
