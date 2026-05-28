# Windows EC2 Instance on Floci

Local implementation for `aws-cloudfolks/01-ec2/01-create-windows-ec2-instance`.

## Run

```bash
pnpm run floci:start
pnpm run floci:health
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation setup
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation seed
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation test
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation cleanup
```

## Files

- `src/client.ts` - EC2 SDK v3 client for Floci.
- `src/use-cases/windows-instance.ts` - key pair, RDP security group, launch, describe, wait, terminate helpers.
- `src/examples/create-windows-instance.ts` - runnable end-to-end example.
- `scripts/setup.ts` - creates key pair + RDP security group.
- `scripts/seed.ts` - launches one tagged Windows-labeled instance.
- `scripts/cleanup.ts` - terminates lab instances and deletes lab resources.
- `tests/client.test.ts` - Vitest integration coverage.

## Note

Floci EC2 runs local Docker containers. Windows AMI selection is API-modeled for course parity; local runtime is container-backed/fallback, not real Windows/RDP.
