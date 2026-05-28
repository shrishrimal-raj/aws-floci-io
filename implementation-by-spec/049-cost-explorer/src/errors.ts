import { AppError } from "@floci-lab/errors";

export class CostExplorerError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`COST_EXPLORER_${code}`, message, cause);
  }
}
