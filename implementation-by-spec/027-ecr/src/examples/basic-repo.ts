#!/usr/bin/env tsx
import { createRepository, deleteRepository } from "../use-cases/repositories.js";
const name = `floci-ecr-${Date.now()}`;
await createRepository(name); await deleteRepository(name);
