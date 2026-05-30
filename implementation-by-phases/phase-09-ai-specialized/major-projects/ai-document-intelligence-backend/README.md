# AI Document Intelligence Backend

Hands-on backend for secure AI document processing: upload PDF, run Textract, create Bedrock summary prompt, index search document, and deliver PDFs through CloudFront policy.

## Scenarios

1. **SFTP tenant intake** - Transfer Family user lands files in tenant S3 prefix and emits `DocumentIngested` event.
2. **Invoice intelligence** - Textract lines become Bedrock prompt, search body, metadata, and metrics.
3. **Controlled AI rollout** - AppConfig-style flag enables Bedrock summaries per tenant percentage.
4. **Secure delivery** - tenant IAM policy, audit log, and short-lived CloudFront policy protect PDFs.
5. **Production operations** - event pipeline, retries, MSK replay group, lifecycle, cost estimate, and DR plan.

## Run

```bash
pnpm --filter @floci-lab/phase-09 lab
pnpm --filter @floci-lab/phase-09 lab:enterprise
pnpm --filter @floci-lab/phase-09 lab:compliance
pnpm --filter @floci-lab/phase-09 lab:operations
```

Read main `../../README.md` for function map and production checklist.
