# Spec: Create a Windows EC2 Instance with Floci

## Goal

Recreate the course flow in `transcript.md` using Floci instead of real AWS Console: choose a Windows AMI, create a key pair, create a security group that allows RDP (`3389`), launch one EC2 instance, inspect it, then terminate it.

## User story

As a learner, I want a local, repeatable EC2 lab so I can practice the Windows instance launch workflow without AWS cost or account risk.

## Scope

- Use AWS SDK v3 for EC2.
- Target Floci endpoint `http://localhost:4566` by default.
- Use dummy local credentials `test/test`.
- Model a Windows Server launch with a Windows-labeled AMI ID.
- Create or reuse one security group for RDP ingress.
- Create a key pair for launch authentication metadata.
- Tag instance with a human-readable name.
- Provide setup, seed, cleanup, example, and Vitest integration tests.

## Floci behavior

From `floci.io/ec2/docs.md`:

- EC2 uses AWS Query API on port `4566`.
- `RunInstances`, `DescribeInstances`, `TerminateInstances`, security groups, key pairs, tags, default VPC, and default subnets are supported.
- Floci launches Docker containers for instances. Windows AMIs are represented for API compatibility, but local execution is Linux-container backed/fallback.
- Security group rules are stored and returned, but not enforced at Docker network level.
- `CreateKeyPair` returns dummy private key material; import a real key for working SSH. RDP is modeled, not actually available locally.

## Acceptance criteria

1. `pnpm install` registers package in workspace.
2. `pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation test` passes while Floci is running.
3. Setup creates key pair + RDP security group.
4. Seed launches one tagged Windows-labeled EC2 instance.
5. Cleanup terminates tagged lab instances and deletes lab key pair/security group when possible.
6. Code exports reusable functions for key pairs, security groups, instance launch, state polling, describe, and cleanup.

## Commands

```bash
pnpm run floci:start
pnpm run floci:health
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation setup
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation seed
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation test
pnpm --dir aws-cloudfolks/01-ec2/01-create-windows-ec2-instance/implementation cleanup
```
