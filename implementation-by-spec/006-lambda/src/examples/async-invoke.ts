#!/usr/bin/env tsx
import { createFunction, deleteFunction, invokeEvent } from "../use-cases/functions.js";

const name = `floci-lambda-event-${Date.now()}`;

await createFunction({ name, environment: { STAGE: "local" }, timeoutSeconds: 5, memoryMb: 128 });
try {
  console.log(await invokeEvent(name, { type: "order.created", orderId: "o1" }));
} finally {
  await deleteFunction(name);
}
