#!/usr/bin/env tsx
import { createHostedZone } from "../src/use-cases/dns.js";
export const zoneName = process.env.ROUTE53_ZONE ?? "example.com";
const zone = await createHostedZone(zoneName);
console.log(`Setup Route53 zone ${zone?.Id}`);
