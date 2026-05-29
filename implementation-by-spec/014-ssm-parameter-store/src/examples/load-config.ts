#!/usr/bin/env tsx
import { deleteParameter, loadConfigByPath, parameterPath, putStringParameter } from "../use-cases/parameters.js";

const name = parameterPath("floci-ssm", "dev", `db-url-${Date.now()}`);
await putStringParameter(name, "postgres://localhost");
try {
  console.log(await loadConfigByPath("/floci-ssm/dev"));
} finally {
  await deleteParameter(name);
}
