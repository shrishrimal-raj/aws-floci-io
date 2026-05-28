import { AppError } from "@floci-lab/errors";

export class Route53Error extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ROUTE53_${code}`, message, cause);
  }
}
