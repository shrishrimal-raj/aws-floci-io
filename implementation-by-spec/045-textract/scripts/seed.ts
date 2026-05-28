#!/usr/bin/env tsx
import { extractLines } from "../src/use-cases/documents.js";
console.log(extractLines([{BlockType:"LINE",Text:"sample"}]));
