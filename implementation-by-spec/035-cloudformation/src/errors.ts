import { AppError } from "@floci-lab/errors";

export class CloudFormationError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`CLOUDFORMATION_${code}`, message, cause);
  }
}
