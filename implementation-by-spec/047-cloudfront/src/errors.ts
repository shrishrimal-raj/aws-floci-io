import { AppError } from "@floci-lab/errors";

export class CloudFrontError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`CLOUDFRONT_${code}`, message, cause);
  }
}
