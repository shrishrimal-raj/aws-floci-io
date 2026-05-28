import { AppError } from "@floci-lab/errors";

export class BedrockRuntimeError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`BEDROCK_RUNTIME_${code}`, message, cause);
  }
}
