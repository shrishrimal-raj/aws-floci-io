# Exercises - EKS

## Beginner
1. Use the SDK v3 client to perform the most basic operation (e.g. list buckets / queues / tables).
2. Add error handling that maps SDK exceptions to your typed errors.
3. Write a Vitest test that asserts the basic operation succeeds.

## Intermediate
1. Implement a realistic use-case (see `src/use-cases/`).
2. Add idempotency and retries.
3. Cover the happy path + 2 error paths with tests.

## Advanced
1. Add observability: structured logs + a custom metric.
2. Add input validation with Zod.
3. Simulate failure (kill Floci mid-call) and verify retry behavior.

## Office-style scenario
> Your team is building managed kubernetes. irsa, addons. You own the integration. Design + implement + test + document the module so a teammate can use it next week without asking you questions. Deliverables: module code, tests, README, runbook.
