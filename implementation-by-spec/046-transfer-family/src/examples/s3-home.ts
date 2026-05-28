#!/usr/bin/env tsx
import { s3Home } from "../use-cases/servers.js";
console.log(s3Home("bucket","home/user"));
