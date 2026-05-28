#!/usr/bin/env tsx
import { deleteRedisCluster } from "../src/use-cases/redis.js";
const clusterId = process.env.REDIS_CLUSTER_ID ?? "floci-redis-lab";
await deleteRedisCluster(clusterId);
console.log(`Cleanup ElastiCache Redis ${clusterId}`);
