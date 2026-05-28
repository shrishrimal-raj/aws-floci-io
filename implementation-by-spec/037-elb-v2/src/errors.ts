import { AppError } from "@floci-lab/errors";

export class ELBv2ALBNLBError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ELB_V2_${code}`, message, cause);
  }
}
