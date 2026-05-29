#!/usr/bin/env tsx
import { multiStatementPolicy, policyDocument } from "../use-cases/access.js";

console.log(policyDocument(["s3:GetObject"], ["arn:aws:s3:::example-bucket/*"]));
console.log(
  multiStatementPolicy([
    { actions: ["s3:GetObject"], resources: ["arn:aws:s3:::example-bucket/*"] },
    { effect: "Deny", actions: ["s3:DeleteObject"], resources: ["arn:aws:s3:::example-bucket/*"] },
  ])
);
