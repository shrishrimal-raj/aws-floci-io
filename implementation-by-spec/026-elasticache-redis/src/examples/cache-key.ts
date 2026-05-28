#!/usr/bin/env tsx
import { cacheKey, redisUrl } from "../use-cases/redis.js";
console.log(redisUrl("localhost",6379,false), cacheKey("app","dev","user:1"));
