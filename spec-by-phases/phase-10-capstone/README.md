# Phase 10 - Capstone Projects

> **Theme**: 10 production-style backend systems integrating 20+ services
> **Difficulty**: 5/5
> **Estimated time**: 8–12 weeks

## Learning goals
- Integrate 10+ AWS services into one cohesive system
- Apply IaC, CI/CD, observability, and security end-to-end
- Make production-grade trade-offs (cost vs latency vs durability)

## Services covered
_See phase description._

## Concepts to master
- Choosing the right service per requirement
- Designing for failure
- Cost-aware architecture

## Mini-projects
_n/a_

## Major real-world project
**Final Enterprise Backend** - Pick 3–5 capstones and build them to production grade. The final one integrates 20+ services across compute, data, events, security, and observability.

Lives in: `implementation-by-phases/phase-10-capstone/major-projects/final-enterprise-backend/`

## Folder structure
```
implementation-by-phases/phase-10-capstone/
├── README.md
├── package.json
├── src/
├── tests/
└── major-projects/
    └── final-enterprise-backend/
```

## Codex CLI prompt
See `prompts/phases/phase-10.md`.

## Acceptance criteria
- All service folders for this phase have green tests.
- The major project runs end-to-end against Floci.
- Documentation is complete.

## Tests to run
```bash
docker compose up -d

cd implementation-by-phases/phase-10-capstone && pnpm test
```

## Common bugs to debug
- See each individual capstone project

## What a real production version would add
Each capstone is already production-shaped.

## Recommended order
Complete services in the order listed under 'Services covered' before tackling the major project.
