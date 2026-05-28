import { AppError } from "@floci-lab/errors";

export class PricingAPIError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`PRICING_${code}`, message, cause);
  }
}
