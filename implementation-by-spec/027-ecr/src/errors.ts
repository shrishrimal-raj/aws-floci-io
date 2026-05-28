import { AppError } from "@floci-lab/errors";

export class ECRError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ECR_${code}`, message, cause);
  }
}
