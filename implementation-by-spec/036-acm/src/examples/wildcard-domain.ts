#!/usr/bin/env tsx
import { wildcard } from "../use-cases/certificates.js";

console.log(wildcard("example.com"));
console.log(wildcard("*.api.example.com"));
