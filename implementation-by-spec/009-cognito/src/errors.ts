import { AppError } from "@floci-lab/errors";

export class CognitoError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`COGNITO_${code}`, message, cause);
  }
}
