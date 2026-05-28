import { AppError } from "@floci-lab/errors";

export class EC2Error extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EC2_${code}`, message, cause);
  }
}
