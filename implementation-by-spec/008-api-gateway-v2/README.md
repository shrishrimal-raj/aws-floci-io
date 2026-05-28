# 008 - API Gateway v2 (HTTP)

Lightweight HTTP APIs: faster, cheaper, fewer features than REST APIs.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/http-api.ts` creates HTTP APIs, integrations, routes, auto-deploy stages, deletes APIs, and formats proxy responses.

## Runbook
Create API, add integration/route, auto-deploy `$default`, test route, cleanup by API id. Real AWS: add auth, CORS, throttling, access logs, custom domains, and route-level monitoring.
