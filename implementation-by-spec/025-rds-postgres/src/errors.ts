import { AppError } from "@floci-lab/errors";

export class RDSPostgresError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`RDS_POSTGRES_${code}`, message, cause);
  }
}
