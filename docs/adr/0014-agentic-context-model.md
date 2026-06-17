# ADR-0014: Agentic context model (CLAUDE.md + ADRs + recipes + hooks + MCP)

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The explicit goal of this repo is to be built with **AI-first agentic engineering**:
context organized so agents (and humans) can do future work reliably and uniformly.
We model that as four pillars: Context, Recipes, Guardrails, Tool access.

## Decision

**1. Context — hierarchical CLAUDE.md + ADRs + conventions.**

- Root `CLAUDE.md` (overview, golden rules) + a scoped `CLAUDE.md` per package, so an
  agent loads only the relevant package's context.
- `docs/adr/` records every significant decision (this set).
- `docs/conventions.md` holds coding conventions all packages follow.

**2. Recipes — project skills in `.claude/skills/`.**
The repeatable "how we do X here" guides: `scaffold-domain-package`,
`add-ai-agent`, `add-ui-component-from-figma`, `add-db-migration`. Each is proven by
the reference slice using it, so they're concrete, not theoretical.

**3. Guardrails — automation.**
Prettier + ESLint + TypeScript on save (fast local feedback via Claude Code hooks in
`.claude/settings.json`), a pre-commit check, and a full CI gate (typecheck, lint,
unit + E2E tests, build) on every PR. Agents get immediate signal; bad changes can't merge.

**4. Tool access — MCP servers in `.mcp.json`.**

- **Figma** — design source of truth (design-to-code).
- **Context7** — live library docs; prefer over memory for API usage.
- **Neon (Postgres)** — inspect the dev schema/data (read-only, dev-scoped).
- **Playwright** — drive and visually verify the running app.

## Consequences

- Per-task context is small and relevant; patterns are documented and replicable;
  mistakes are caught automatically; agents can reach the systems they need.
- These artifacts must be **maintained**: update a package's `CLAUDE.md` when its
  shape changes, add an ADR for new decisions, update recipes when patterns evolve.
  Stale agentic context is worse than none.

## Alternatives considered

- **Single root CLAUDE.md:** doesn't scale; every agent loads everything.
- **Heavy upfront spec set:** slow and drifts from reality before code exists.
- **CI-only guardrails / minimal automation:** slower feedback, weaker safety.
