import crypto from "node:crypto";

export interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

export interface CognitoClaims {
  iss: string;
  aud?: string;
  client_id?: string;
  exp: number;
  iat?: number;
  token_use?: "id" | "access";
  sub: string;
  email?: string;
  "custom:tenant_id"?: string;
  [key: string]: unknown;
}

export interface JwtVerificationOptions {
  issuer: string;
  audience: string;
  tokenUse?: "id" | "access";
  nowSeconds?: number;
}

export interface AuthContext {
  subject: string;
  tenantId: string;
  email?: string;
  claims: CognitoClaims;
}

export function decodeJwt(token: string): { header: JwtHeader; claims: CognitoClaims; signingInput: string; signature: Buffer } {
  const [encodedHeader, encodedClaims, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedClaims || !encodedSignature) throw new Error("JWT must have header, claims, signature");
  return {
    header: JSON.parse(base64UrlDecode(encodedHeader).toString("utf8")) as JwtHeader,
    claims: JSON.parse(base64UrlDecode(encodedClaims).toString("utf8")) as CognitoClaims,
    signingInput: `${encodedHeader}.${encodedClaims}`,
    signature: base64UrlDecode(encodedSignature),
  };
}

export function verifyCognitoClaims(claims: CognitoClaims, options: JwtVerificationOptions): AuthContext {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const audience = claims.aud ?? claims.client_id;
  if (claims.iss !== options.issuer) throw new Error("JWT issuer mismatch");
  if (audience !== options.audience) throw new Error("JWT audience mismatch");
  if (claims.exp <= now) throw new Error("JWT expired");
  if (options.tokenUse && claims.token_use !== options.tokenUse) throw new Error("JWT token_use mismatch");
  const tenantId = claims["custom:tenant_id"];
  if (!tenantId || typeof tenantId !== "string") throw new Error("JWT tenant claim missing");
  return { subject: claims.sub, tenantId, email: claims.email, claims };
}

export function verifyJwtSignature(token: string, publicKeyPem: string): CognitoClaims {
  const decoded = decodeJwt(token);
  if (decoded.header.alg !== "RS256") throw new Error(`Unsupported JWT alg: ${decoded.header.alg}`);
  const verified = crypto.verify("RSA-SHA256", Buffer.from(decoded.signingInput), publicKeyPem, decoded.signature);
  if (!verified) throw new Error("JWT signature invalid");
  return decoded.claims;
}

export function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}
