# Phase 09 - AI, Documents, Specialized Services

> **Theme**: Bedrock, Textract, Transfer Family, AppConfig, CloudFront, MSK
> **Difficulty**: 4/5
> **Estimated time**: 2 weeks

## Learning goals
- Call LLMs via Bedrock Runtime with streaming
- Extract structured data from PDFs via Textract
- Run an SFTP endpoint via Transfer Family
- Manage feature flags with AppConfig
- Serve assets via CloudFront with signed URLs
- Run Kafka workloads on MSK

## Services covered
- [031 - MSK (Kafka)](../../spec-by-services/031-msk-kafka/README.md)
- [043 - AppConfig](../../spec-by-services/043-appconfig/README.md)
- [044 - Bedrock Runtime](../../spec-by-services/044-bedrock-runtime/README.md)
- [045 - Textract](../../spec-by-services/045-textract/README.md)
- [046 - Transfer Family](../../spec-by-services/046-transfer-family/README.md)
- [047 - CloudFront](../../spec-by-services/047-cloudfront/README.md)

## Concepts to master
- Prompt engineering and structured output
- Textract async jobs for multi-page docs
- AppConfig deployment strategies
- CloudFront cache policies, signed URLs/cookies
- Kafka consumer group rebalance

## Mini-projects
- Streaming LLM chat backend on Bedrock
- Invoice OCR pipeline with Textract
- Feature flag service with AppConfig

## Major real-world project
**AI Document Intelligence Backend** - Upload PDF → Textract async → Bedrock summarization → store in OpenSearch with vector embeddings → query via REST. CloudFront fronts the upload bucket.

Lives in: `implementation-by-phases/phase-09-ai-specialized/major-projects/ai-document-intelligence-backend/`

## Folder structure
```
implementation-by-phases/phase-09-ai-specialized/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── ai-document-intelligence-backend/
```

## Codex CLI prompt
See `prompts/phases/phase-09.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d
cd implementation-by-spec/031-msk-kafka && pnpm test && cd -
cd implementation-by-spec/043-appconfig && pnpm test && cd -
cd implementation-by-spec/044-bedrock-runtime && pnpm test && cd -
cd implementation-by-spec/045-textract && pnpm test && cd -
cd implementation-by-spec/046-transfer-family && pnpm test && cd -
cd implementation-by-spec/047-cloudfront && pnpm test && cd -
cd implementation-by-phases/phase-09-ai-specialized && pnpm test
```

## Common bugs to debug
- Bedrock model not enabled in region
- Textract async polling backoff missing
- CloudFront cache-control header overriding origin

## What a real production version would add
Production adds prompt versioning, PII redaction before LLM, and AppConfig validators.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
