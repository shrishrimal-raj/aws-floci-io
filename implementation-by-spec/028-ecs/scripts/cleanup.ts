#!/usr/bin/env tsx
import { deleteCluster } from "../src/use-cases/services.js";
const clusterName = process.env.ECS_CLUSTER ?? "floci-ecs-lab";
await deleteCluster(clusterName);
console.log(`Cleanup ECS cluster ${clusterName}`);
