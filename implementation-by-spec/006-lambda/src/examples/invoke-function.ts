#!/usr/bin/env tsx
import { createFunction, deleteFunction, invokeJson } from "../use-cases/functions.js";
const name = `floci-lambda-example-${Date.now()}`;
await createFunction({ name });
try { console.log(await invokeJson(name, { ping: true })); } finally { await deleteFunction(name); }
