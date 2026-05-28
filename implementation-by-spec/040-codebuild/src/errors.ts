import { AppError } from "@floci-lab/errors";

export class CodeBuildError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`CODEBUILD_${code}`, message, cause);
  }
}
