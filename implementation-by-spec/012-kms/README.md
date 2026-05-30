# 012 - KMS

KMS hands-on module for symmetric keys, aliases, encrypt/decrypt, data keys, envelope encryption, audit-friendly security patterns, lifecycle planning, cost, DR, and compliance.

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

## Key files

- `src/client.ts` - AWS SDK v3 KMS client for Floci (`http://localhost:4566`).
- `src/use-cases/crypto.ts` - create keys/aliases, describe keys, encrypt/decrypt strings, generate data keys, schedule deletion.
- `src/use-cases/enterprise.ts` - encryption context, audit events, retry/backoff, key policy, lifecycle events, cost estimate, compliance checks, DR runbook.
- `src/examples/` - practical enterprise scenarios.
- `scripts/` - setup, seed, cleanup lab commands.

## Operations covered

| Operation | Function | Why it matters |
|---|---|---|
| Create key | `createKey` | Create symmetric `ENCRYPT_DECRYPT` key. |
| Create alias | `createAlias` | Use stable app config names instead of raw key IDs. |
| Key + alias | `createKeyWithAlias` | Provision key and alias together. |
| Describe key | `describeKey` | Check metadata and state. |
| Encrypt string | `encryptString` | Protect small secrets or test payloads. Supports encryption context. |
| Decrypt string | `decryptString` | Decrypt bytes back to UTF-8 with matching context. |
| Data key | `generateDataKey` | Envelope encryption for larger data. Supports encryption context. |
| Envelope key | `generateEnvelopeDataKey` | Require plaintext and encrypted data key bytes. |
| Delete key | `scheduleKeyDeletion` | Safe deletion window; ignores missing keys. |
| Audit event | `kmsAuditEvent` | Log KMS usage without plaintext. |
| Retry | `retryKmsOperation` | Handle throttling without retry storms. |
| Key policy | `applicationKeyPolicy` | Model least-privilege admin/app access. |
| Compliance | `kmsComplianceFindings` | Gate alias, rotation, context, tags, deletion window. |
| DR | `kmsDisasterRecoveryRunbook` | Plan encrypted workload recovery. |

## Enterprise examples

```bash
pnpm example:tenant-context   # tenant-bound encrypt/decrypt + audit + retry
pnpm example:envelope-pii     # PII envelope encryption metadata pattern
pnpm example:compliance       # key policy, cost, lifecycle event, compliance gate
pnpm example:dr               # encrypted workload disaster-recovery runbook
```

Existing basics:

- `src/examples/encrypt-decrypt.ts` - create key, encrypt, decrypt, cleanup.
- `src/examples/key-alias.ts` - create key with alias.
- `src/examples/data-key.ts` - generate data key metadata.

## Production notes

Use aliases in app config, not raw key IDs. Always pass encryption context for tenant/workload-bound ciphertext. Do not log plaintext data keys or decrypted secrets. Prefer envelope encryption for large payloads. Enable rotation where supported. Use least-privilege key policies and IAM. Record CloudTrail/audit evidence. Use deletion windows and DR runbooks before scheduling deletion.

## Floci vs real AWS

Floci support is partial. Real AWS adds full key policies, grants, automatic rotation, multi-region keys, quotas, request pricing, CloudTrail, service-integrated encryption, imported key material, HSM-backed keys, and eventual key-state transitions.
