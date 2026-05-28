import { AppError } from "@floci-lab/errors";

export class ResourceGroupsTaggingAPIError extends AppError {
  constructor(code: string, message: string, cause?: unknown) {
    super(`RESOURCE_GROUPS_TAGGING_API_${code}`, message, cause);
  }
}
