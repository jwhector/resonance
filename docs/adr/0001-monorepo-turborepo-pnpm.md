# ADR-0001: Monorepo with Turborepo + pnpm

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

Resonance spans several domains (commerce, community, AI, design system) and is
meant to be scalable and "AI-first": organized so agents can work on one area with
minimal, relevant context. We want clean boundaries between domains and a future in
which non-web clients could reuse business logic.

## Decision

Use a **single repository** structured as a **pnpm + Turborepo monorepo**. Domain
logic lives in `packages/*`; the Next.js app in `apps/web` consumes them. Turborepo
orchestrates and caches tasks (build/lint/typecheck/test); pnpm provides strict,
content-addressed installs.

## Consequences

- Clear package boundaries that double as context boundaries (ADR-0003).
- Incremental, cached builds/tests — only changed packages rebuild.
- Slightly more upfront setup than a single app, and contributors must understand
  workspace mechanics (documented in the root `CLAUDE.md`).

## Alternatives considered

- **Single Next.js app:** simplest, but tangles domains and blocks logic extraction.
- **next-forge starter:** batteries-included, but imposes choices agents must
  reverse-engineer and a generic design system that fights the bespoke Resonance look.
- **pnpm workspaces without Turborepo:** loses task caching/orchestration at scale.
