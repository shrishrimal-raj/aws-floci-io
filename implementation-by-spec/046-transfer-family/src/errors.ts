import { AppError } from "@floci-lab/errors";

export class TransferFamilyError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`TRANSFER_FAMILY_${code}`, message, cause);
  }
}
