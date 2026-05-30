import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { authContextFromClaims, base64UrlEncode, decodeJwt, verifyCognitoClaims, verifyJwtSignature, type CognitoClaims } from "../src/jwt-auth.js";

function makeSignedJwt(claims: CognitoClaims) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const header = { alg: "RS256", typ: "JWT", kid: "kid-1" };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(signingInput), privateKey).toString("base64url");
  return { token: `${signingInput}.${signature}`, publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString() };
}

const claims: CognitoClaims = {
  iss: "https://cognito-idp.us-east-1.amazonaws.com/pool",
  aud: "client-1",
  exp: 2_000_000_000,
  token_use: "id",
  sub: "user-1",
  email: "user@example.com",
  "custom:tenant_id": "tenant-a",
};

describe("Cognito JWT auth", () => {
  it("decodes and verifies RS256 signature", () => {
    const { token, publicKeyPem } = makeSignedJwt(claims);
    expect(decodeJwt(token).claims.sub).toBe("user-1");
    expect(verifyJwtSignature(token, publicKeyPem).aud).toBe("client-1");
    expect(authContextFromClaims(claims)).toMatchObject({ tenantId: "tenant-a", subject: "user-1" });
  });

  it("validates issuer, audience, expiry, token use, tenant claim", () => {
    expect(
      verifyCognitoClaims(claims, {
        issuer: claims.iss,
        audience: "client-1",
        tokenUse: "id",
        nowSeconds: 1_700_000_000,
      })
    ).toMatchObject({ subject: "user-1", tenantId: "tenant-a", email: "user@example.com" });
  });

  it("rejects wrong audience", () => {
    expect(() => verifyCognitoClaims(claims, { issuer: claims.iss, audience: "other", nowSeconds: 1 })).toThrow("JWT audience mismatch");
  });
});
