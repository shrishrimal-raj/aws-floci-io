import { AppError } from "@floci-lab/errors";

export class APIGatewayv2HTTPError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`API_GATEWAY_V2_${code}`, message, cause);
  }
}
