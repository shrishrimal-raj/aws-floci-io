#!/usr/bin/env tsx
import { atExpression, cronExpression, everyMinutes } from "../use-cases/schedules.js";

console.log(everyMinutes(5));
console.log(cronExpression("0", "12"));
console.log(atExpression("2026-01-01T00:00:00Z"));
