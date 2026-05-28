#!/usr/bin/env tsx
import { createRedisCluster } from "../src/use-cases/redis.js";
export const clusterId = process.env.REDIS_CLUSTER_ID ?? "floci-redis-lab";
await createRedisCluster(clusterId);
console.log(`Setup ElastiCache Redis ${clusterId}`);
