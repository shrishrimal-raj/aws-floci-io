import { AppError } from "@floci-lab/errors";

export class SecretsManagerError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`SECRETS_MANAGER_${code}`, message, cause);
  }
}
