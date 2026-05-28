#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
spawnSync("docker", ["compose", "down", "-v"], { stdio: "inherit" });
spawnSync("docker", ["compose", "up", "-d"], { stdio: "inherit" });
console.log("Floci reset.");
