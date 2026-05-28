# 014 - SSM Parameter Store

Hierarchical config + secrets. Module supports string/json params, secure strings, path reads, delete, and path builder.

## Run
`pnpm setup && pnpm seed && pnpm test && pnpm cleanup`

Real AWS: use KMS for SecureString, path IAM boundaries, version/audit config, cache reads.
