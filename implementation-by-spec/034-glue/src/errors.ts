import { AppError } from "@floci-lab/errors";

export class GlueError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`GLUE_${code}`, message, cause);
  }
}
