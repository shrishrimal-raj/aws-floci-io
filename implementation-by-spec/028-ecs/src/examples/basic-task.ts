#!/usr/bin/env tsx
import { createCluster, deleteCluster, registerFargateTask } from "../use-cases/services.js";
const name = `floci-ecs-${Date.now()}`;
await createCluster(name); console.log(await registerFargateTask(`${name}-task`,"node:22-alpine")); await deleteCluster(name);
