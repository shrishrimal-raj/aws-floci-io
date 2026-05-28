# Self-Service Deploy Platform

A pipeline that takes a Git push, builds in CodeBuild, deploys to ECS via CodeDeploy with blue/green, runs smoke tests, and auto-rolls back on alarm.

See `spec-by-phases/phase-07-devops-delivery/README.md` for the full spec.
