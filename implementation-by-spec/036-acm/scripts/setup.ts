#!/usr/bin/env tsx
import { requestDnsCertificate } from "../src/use-cases/certificates.js";
export const domain = process.env.ACM_DOMAIN ?? "example.com";
const arn = await requestDnsCertificate(domain,[`*.${domain}`]);
console.log(`Setup ACM certificate ${arn}`);
