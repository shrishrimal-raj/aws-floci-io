import { AppError } from "@floci-lab/errors";

export class ElastiCacheRedisError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`ELASTICACHE_REDIS_${code}`, message, cause);
  }
}
