import { AppError } from "@floci-lab/errors";

export class SESv2Error extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`SES_V2_${code}`, message, cause);
  }
}
