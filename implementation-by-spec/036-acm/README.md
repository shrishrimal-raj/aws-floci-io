# 036 - ACM

> TLS certificate management with DNS validation requests, certificate listing/description, wildcard names, and cleanup.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/036-acm
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - ACM SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/certificates.ts` - request DNS certificates, describe/list certificates, delete certificates, build wildcard domains.
- `src/examples/basic-certificate.ts` - baseline request/describe/delete flow.
- `src/examples/wildcard-domain.ts` - wildcard SAN/domain helper.
- `src/examples/list-certificates.ts` - list certificate summaries.
- `scripts/setup.ts` - requests lab certificate.
- `scripts/seed.ts` - describes/list certificates for fixture validation.
- `scripts/cleanup.ts` - deletes lab certificate.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Request DNS certificate | `requestDnsCertificate` | Requests public certificate with DNS validation and optional SANs. |
| Describe certificate | `describeCertificate` | Reads validation/status/domain metadata. |
| List certificates | `listCertificates` | Lists certificate summaries. |
| Delete certificate | `deleteCertificate` | Idempotent cleanup for missing certificates. |
| Wildcard domain | `wildcard` | Normalizes `example.com` or `*.example.com` to wildcard form. |

## Use cases

```ts
import { requestDnsCertificate, describeCertificate, wildcard, deleteCertificate } from "./src/index.js";

const arn = await requestDnsCertificate("example.com", [wildcard("example.com")]);
console.log(await describeCertificate(arn));
await deleteCertificate(arn);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Request lab certificate: `pnpm setup`.
4. Describe/list fixture certificate: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Cleanup certificate: `pnpm cleanup`.

## Gotchas

- DNS validation requires adding CNAME records in real hosted zone.
- CloudFront requires ACM certificates in `us-east-1`.
- ALB/API Gateway regional certs must live in same region as integration.
- Wildcard certs only cover one label depth: `*.example.com` not `a.b.example.com`.
- Monitor renewal status and validation records; deleted DNS records can break renewal.
- Private CA, imported certs, and public ACM certificates have different lifecycle/cost rules.

## Floci vs Real AWS

Floci support: **stub/partial** for this lab. On real AWS, configure DNS validation, certificate transparency expectations, renewal monitoring, regional placement, IAM least privilege, and service integrations (CloudFront, ALB, API Gateway). Real AWS also has validation delays, certificate quotas, managed renewal behavior, imported certificate expiry, and regional constraints that local Floci does not fully model.
