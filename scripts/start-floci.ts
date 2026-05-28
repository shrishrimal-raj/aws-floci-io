#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
spawnSync("docker", ["compose", "up", "-d"], { stdio: "inherit" });
