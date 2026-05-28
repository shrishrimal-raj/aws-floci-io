# Project 008 - Search & Recommendation Backend

## Business scenario
Product catalog with typo-tolerant search, faceted filters, and LLM-based 'similar products' recommendations.

## AWS services used
- OpenSearch
- DynamoDB
- Lambda
- Bedrock

## Architecture
- DDB Streams → Lambda → OpenSearch index
- Bedrock generates embedding on write → stored in OS knn_vector field
- Search Lambda combines BM25 + kNN

## API design
TBD - designed in the implementation phase.

## Data model
OS index with text, keyword, knn_vector fields

## Event flow
Product upsert → DDB → Stream → indexer Lambda → OS

## Error handling strategy
Indexer DLQ + replay tool

## Testing strategy
Vitest; assert hits for typos and semantic queries

## Security model
OS fine-grained access control; index per tenant

## Observability model
Search latency p99, indexer lag

## Local Floci setup
```bash
docker compose up -d
cd implementation-by-phases/phase-10-capstone/projects/008-observability-and-ops-platform
pnpm install
pnpm setup
pnpm dev
```

## Codex CLI prompt
See `prompts/projects/008-observability-and-ops-platform.md`.

## Acceptance criteria
- End-to-end happy path works against Floci.
- Tests cover >=80% of business logic.
- Security model enforced (auth + IAM + encryption where applicable).
- Observability: logs + metrics + at least one alarm.
- Documentation includes runbook + architecture diagram.
