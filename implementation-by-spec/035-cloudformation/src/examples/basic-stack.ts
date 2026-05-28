#!/usr/bin/env tsx
import { createStack, deleteStack, s3BucketTemplate } from "../use-cases/stacks.js";
const name = `floci-cfn-${Date.now()}`;
await createStack(name,s3BucketTemplate(name)); await deleteStack(name);
