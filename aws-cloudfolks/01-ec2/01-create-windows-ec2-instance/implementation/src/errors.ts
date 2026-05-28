import { AppError } from "@floci-lab/errors";

export class Ec2WindowsLabError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`EC2_WINDOWS_LAB_${code}`, message, cause);
  }
}
