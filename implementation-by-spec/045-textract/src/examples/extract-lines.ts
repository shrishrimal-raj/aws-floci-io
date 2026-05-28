#!/usr/bin/env tsx
import { extractLines } from "../use-cases/documents.js";
console.log(extractLines([{BlockType:"LINE",Text:"hello"}]));
