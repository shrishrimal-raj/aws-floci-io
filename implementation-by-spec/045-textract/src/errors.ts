import { AppError } from "@floci-lab/errors";

export class TextractError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`TEXTRACT_${code}`, message, cause);
  }
}
