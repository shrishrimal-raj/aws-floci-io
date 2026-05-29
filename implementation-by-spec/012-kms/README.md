# 012 - KMS

> Encryption keys, aliases, string encrypt/decrypt helpers, data keys, envelope encryption primitives, metadata reads, and scheduled deletion.

## Quick start

```bash
docker compose up -d
pnpm install
cd implementation-by-spec/012-kms
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module

- `src/client.ts` - KMS SDK v3 client for Floci (`http://localhost:4566`).
- `src/use-cases/crypto.ts` - key/alias creation, describe, encrypt/decrypt strings, data keys, envelope key helper, scheduled deletion.
- `src/examples/encrypt-decrypt.ts` - create key, encrypt string, decrypt string, cleanup.
- `src/examples/key-alias.ts` - create key and alias bundle.
- `src/examples/data-key.ts` - generate envelope data key metadata.
- `scripts/setup.ts` - creates lab key/alias.
- `scripts/seed.ts` - encrypts fixture data.
- `scripts/cleanup.ts` - schedules lab key deletion.

## Operations covered

| Operation | Function | Notes |
|---|---|---|
| Create key | `createKey` | Symmetric `ENCRYPT_DECRYPT` key. |
| Create alias | `createAlias` | Accepts names with or without `alias/` prefix. |
| Key + alias bundle | `createKeyWithAlias` | Creates key then stable alias. |
| Describe key | `describeKey` | Reads metadata and key state. |
| Encrypt string | `encryptString` | UTF-8 plaintext → ciphertext bytes. |
| Decrypt string | `decryptString` | Ciphertext bytes → UTF-8 plaintext. |
| Generate data key | `generateDataKey` | KMS plaintext + encrypted data key response. |
| Envelope data key | `generateEnvelopeDataKey` | Requires plaintext and encrypted key bytes. |
| Schedule deletion | `scheduleKeyDeletion` | 7-day pending deletion; idempotent for missing keys. |

## Use cases

```ts
import { createKeyWithAlias, encryptString, decryptString, generateEnvelopeDataKey, scheduleKeyDeletion } from "./src/index.js";

const { keyId } = await createKeyWithAlias("alias/app-secrets", "app secrets");
const ciphertext = await encryptString(keyId, "secret-value");
console.log(await decryptString(ciphertext));
console.log(await generateEnvelopeDataKey(keyId, 32));
await scheduleKeyDeletion(keyId);
```

## Runbook

1. Start Floci: `docker compose up -d`.
2. Check health: `pnpm run floci:health` from repo root.
3. Provision key/alias: `pnpm setup`.
4. Encrypt fixture data: `pnpm seed`.
5. Run tests: `pnpm test`.
6. Schedule key deletion: `pnpm cleanup`.

## Gotchas

- KMS encrypt/decrypt boundaries are bytes, not strings; encode/decode explicitly.
- Do not log plaintext data keys. Zero/forget plaintext key material after local encryption.
- Use aliases in app config so key IDs can rotate behind stable names.
- Key deletion is scheduled, not immediate, on real AWS. Pending window prevents accidental loss.
- Key policies and IAM both affect access; least-privilege decrypt access is critical.
- Envelope encryption is for larger payloads; direct KMS encrypt has plaintext size limits.

## Floci vs Real AWS

Floci support: **partial** for this lab. On real AWS, configure key policies, IAM grants, automatic rotation, CloudTrail audit, multi-region keys where needed, deletion windows, encryption context, and least-privilege decrypt permissions. Real AWS also has request quotas, per-request pricing, eventual key state transitions, grants, imported key material, HSM-backed keys, and service-integrated encryption behavior that local Floci does not fully model.
