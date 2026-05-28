#!/usr/bin/env tsx
import { bucket } from "./setup.js";
import { putObject } from "../src/use-cases/object-storage.js";

await putObject({
  bucket,
  key: "fixtures/readme.txt",
  body: "seeded fixture object",
  contentType: "text/plain",
});

console.log(`Seed S3 bucket ${bucket}`);
