#!/usr/bin/env tsx
import { assertJwtClaims, decodeJwtPayload, isJwtExpired } from "../use-cases/user-pools.js";

const payload = Buffer.from(
  JSON.stringify({ sub: "u1", email: "ada@example.com", token_use: "access", exp: Math.floor(Date.now() / 1000) + 3600 })
).toString("base64url");
const claims = decodeJwtPayload(`header.${payload}.signature`);

assertJwtClaims(claims, "access");
console.log({ claims, expired: isJwtExpired(claims) });
