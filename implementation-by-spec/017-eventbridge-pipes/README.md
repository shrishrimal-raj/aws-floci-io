# 017 - EventBridge Pipes

Source → filter → target without Lambda glue. Partial Floci parity.

## Run
`pnpm setup && pnpm seed && pnpm test && pnpm cleanup`

Real AWS: configure batching, enrichment, DLQs, IAM role, source-specific filters.
