import { AppError } from "@floci-lab/errors";

export class SSMParameterStoreError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`SSM_PARAMETER_STORE_${code}`, message, cause);
  }
}
