#!/usr/bin/env tsx
import { listCertificates } from "../use-cases/certificates.js";

console.log(await listCertificates());
