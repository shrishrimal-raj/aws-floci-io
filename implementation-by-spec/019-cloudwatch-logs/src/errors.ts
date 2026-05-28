import { AppError } from "@floci-lab/errors";

export class CloudWatchLogsError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`CLOUDWATCH_LOGS_${code}`, message, cause);
  }
}
