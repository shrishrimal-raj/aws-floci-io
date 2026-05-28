#!/usr/bin/env tsx
import { createCluster, registerFargateTask } from "../src/use-cases/services.js";
export const clusterName = process.env.ECS_CLUSTER ?? "floci-ecs-lab";
await createCluster(clusterName); await registerFargateTask("floci-task","public.ecr.aws/docker/library/node:22-alpine");
console.log(`Setup ECS cluster ${clusterName}`);
