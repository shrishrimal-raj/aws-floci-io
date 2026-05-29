#!/usr/bin/env tsx
import { summarizeCredentials } from "../use-cases/credentials.js";

console.log(
  summarizeCredentials({
    AccessKeyId: "ASIAXAMPLE",
    SecretAccessKey: "do-not-log",
    SessionToken: "do-not-log",
    Expiration: new Date(Date.now() + 900_000),
  })
);
