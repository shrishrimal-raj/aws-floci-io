import { AppError } from "@floci-lab/errors";

export class OpenSearchError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`OPENSEARCH_${code}`, message, cause);
  }
}
