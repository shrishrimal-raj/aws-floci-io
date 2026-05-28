import { AppError } from "@floci-lab/errors";

export class AppConfigError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`APPCONFIG_${code}`, message, cause);
  }
}
