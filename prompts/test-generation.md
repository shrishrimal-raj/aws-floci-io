# Codex CLI - Test Generation

For the given service or project folder, generate Vitest integration tests against Floci.

## Rules
- Use the shared `waitForFloci` helper in `beforeAll`.
- Each test must be idempotent: it provisions its own resources with unique names (uuid suffix) and cleans up in `afterEach` or `afterAll`.
- Cover: happy path, validation failure, AWS error mapping, retry behavior, idempotency.
- No mocks of the SDK. Hit Floci.
- Tests must run in <30s per file.

## Output structure
```
tests/
  client.test.ts         // client is wired correctly
  examples.test.ts       // each example script works
  use-cases.test.ts      // production patterns
  errors.test.ts         // error paths
```
