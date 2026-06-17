# ADR-0003: Package boundaries are agent context boundaries

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

A core goal of this repo is **AI-first agentic engineering**: an agent working on a
task should load only the context relevant to it, and should be physically unable to
create cross-domain spaghetti. Package boundaries can serve double duty as context
boundaries — if we enforce them.

## Decision

Treat each package as a self-contained unit with:

1. Its own `CLAUDE.md` describing what it is, its rules, and what's real vs. stubbed —
   so an agent loads ~one package's worth of context, not the whole repo.
2. A single public entrypoint (`src/index.ts`). Importing another package's internals
   is forbidden (ESLint `no-restricted-imports` + pnpm strictness).
3. Explicitly declared dependencies. **pnpm strict installs** (no shameless hoisting)
   mean a package can only import what its `package.json` declares — no phantom deps.

Cross-cutting types/interfaces live in `@resonance/core`. Domain packages do not
depend on each other directly.

## Consequences

- Small, relevant context per task; smaller blast radius for mistakes.
- Some friction: shared code must be deliberately placed in `core`, not reached for
  ad hoc. This is the point.
- New packages must follow the layout — the `scaffold-domain-package` recipe enforces it.

## Alternatives considered

- **Loose workspaces / hoisting:** convenient, but phantom dependencies blur
  boundaries and let agents import anything, defeating the purpose.
