# 007 - API Gateway v1 (REST)

Full REST APIs with resources, methods, integrations, models, and stages.

## Quick start
```bash
pnpm setup
pnpm seed
pnpm test
pnpm cleanup
```

## Module
`src/use-cases/rest-api.ts` creates REST APIs, resources, mock methods, JSON models, deployments, and deletes APIs.

## Runbook
Create API, add resources/methods/integrations, deploy stage, test invoke URL, cleanup by REST API id. Real AWS: enable request validation, auth, throttling, access logs, WAF, custom domains.
