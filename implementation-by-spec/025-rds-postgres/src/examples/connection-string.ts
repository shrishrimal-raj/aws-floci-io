#!/usr/bin/env tsx
import { connectionString } from "../use-cases/databases.js";
console.log(connectionString("localhost","app","postgres","postgres"));
