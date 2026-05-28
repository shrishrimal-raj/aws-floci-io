import { AppError } from "@floci-lab/errors";

export class CloudWatchMetricsError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`CLOUDWATCH_METRICS_${code}`, message, cause);
  }
}
