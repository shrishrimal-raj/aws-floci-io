import { AppError } from "@floci-lab/errors";

export class CodeDeployError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`CODEDEPLOY_${code}`, message, cause);
  }
}
