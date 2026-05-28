#!/usr/bin/env tsx
import { requestDnsCertificate, wildcard } from "../use-cases/certificates.js";
console.log(await requestDnsCertificate("example.com",[wildcard("example.com")]));
