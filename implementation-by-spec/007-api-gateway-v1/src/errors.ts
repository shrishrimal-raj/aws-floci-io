import { AppError } from "@floci-lab/errors";

export class APIGatewayv1RESTError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`API_GATEWAY_V1_${code}`, message, cause);
  }
}
